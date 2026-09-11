import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';

import { ExtractJwt, Strategy } from 'passport-jwt';

import { JwtPayload } from './interfaces/jwt-payload.interface';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly usersService: UsersService) {
    super({
      jwtFromRequest:
        ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    let user;
    try {
      user = await this.usersService.findById(payload.sub);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new UnauthorizedException('Compte introuvable');
      }
      throw error;
    }
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Ce compte est désactivé');
    }
    return {
      id: user.id,
      email: user.email,
      roles: user.roles.map((role) => role.name),
    };
  }
}
