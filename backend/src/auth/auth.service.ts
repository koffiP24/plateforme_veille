import { createHash, randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Interval } from '@nestjs/schedule';
import * as bcrypt from 'bcrypt';
import { LessThan, Repository } from 'typeorm';

import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RefreshSession } from './entities/refresh-session.entity';
import { jwtTtlSeconds } from './session-config';

type RefreshPayload = { sub: number; jti: string; type: 'refresh' };

@Injectable()
export class AuthService {
  readonly accessTtlSeconds: number;
  readonly refreshTtlSeconds: number;
  private readonly refreshSecret: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshSession)
    private readonly sessions: Repository<RefreshSession>,
  ) {
    this.accessTtlSeconds = jwtTtlSeconds(config.get<string>('JWT_EXPIRES_IN'), '8h');
    this.refreshTtlSeconds = jwtTtlSeconds(config.get<string>('JWT_REFRESH_EXPIRES_IN'), '7d');
    this.refreshSecret = config.getOrThrow<string>('JWT_REFRESH_SECRET');
    if (this.refreshSecret === config.getOrThrow<string>('JWT_SECRET')) {
      throw new Error('JWT_REFRESH_SECRET doit être différent de JWT_SECRET.');
    }
  }

  private tokenHash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async signTokens(user: User) {
    const roleNames = user.roles.map((role) => role.name);
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      roles: roleNames,
      type: 'access',
    }, { expiresIn: this.accessTtlSeconds });
    const sessionId = randomUUID();
    const refreshToken = await this.jwtService.signAsync({
      sub: user.id,
      jti: sessionId,
      type: 'refresh',
    }, { secret: this.refreshSecret, expiresIn: this.refreshTtlSeconds });
    return { accessToken, refreshToken, sessionId };
  }

  private async verifyRefreshToken(token: string): Promise<RefreshPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshPayload>(
        token, { secret: this.refreshSecret },
      );
      if (payload.type !== 'refresh' || !Number.isInteger(payload.sub) ||
        typeof payload.jti !== 'string') {
        throw new Error('Jeton de rafraîchissement invalide.');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Session expirée. Connectez-vous à nouveau.');
    }
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user) throw new UnauthorizedException('Email ou mot de passe incorrect');
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Ce compte est désactivé');
    if (!await bcrypt.compare(dto.password, user.passwordHash)) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const tokens = await this.signTokens(user);
    await this.sessions.save(this.sessions.create({
      id: tokens.sessionId,
      tokenHash: this.tokenHash(tokens.refreshToken),
      expiresAt: new Date(Date.now() + this.refreshTtlSeconds * 1000),
      user,
    }));
    await this.usersService.updateLastLogin(user.id);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles: user.roles.map((role) => role.name),
      },
    };
  }

  async refresh(token: string | undefined) {
    if (!token) throw new UnauthorizedException('Session expirée. Connectez-vous à nouveau.');
    const payload = await this.verifyRefreshToken(token);
    const session = await this.sessions.findOne({
      where: { id: payload.jti, tokenHash: this.tokenHash(token) },
      relations: { user: { roles: true } },
    });
    if (!session || session.expiresAt <= new Date() ||
      session.user.id !== payload.sub || session.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Session expirée. Connectez-vous à nouveau.');
    }

    const tokens = await this.signTokens(session.user);
    const updated = await this.sessions.update(
      { id: session.id, tokenHash: session.tokenHash },
      {
        id: tokens.sessionId,
        tokenHash: this.tokenHash(tokens.refreshToken),
        expiresAt: new Date(Date.now() + this.refreshTtlSeconds * 1000),
      },
    );
    if (updated.affected !== 1) {
      throw new UnauthorizedException('Session déjà renouvelée. Connectez-vous à nouveau.');
    }
    return tokens;
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    try {
      const payload = await this.verifyRefreshToken(token);
      await this.sessions.delete({
        id: payload.jti,
        tokenHash: this.tokenHash(token),
      });
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) throw error;
    }
  }

  @Interval(24 * 60 * 60 * 1000)
  async removeExpiredSessions(): Promise<void> {
    await this.sessions.delete({ expiresAt: LessThan(new Date()) });
  }
}
