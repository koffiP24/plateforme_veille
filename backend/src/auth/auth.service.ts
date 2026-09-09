import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(
      dto.email,
    );

    if (!user) {
      throw new UnauthorizedException(
        'Email ou mot de passe incorrect',
      );
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'Ce compte est désactivé',
      );
    }

    const passwordIsValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordIsValid) {
      throw new UnauthorizedException(
        'Email ou mot de passe incorrect',
      );
    }

    const roleNames = user.roles.map((role) => role.name);

    const payload = {
      sub: user.id,
      email: user.email,
      roles: roleNames,
    };

    const accessToken =
      await this.jwtService.signAsync(payload);

    await this.usersService.updateLastLogin(user.id);

    return {
      accessToken,

      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles: roleNames,
      },
    };
  }
}
