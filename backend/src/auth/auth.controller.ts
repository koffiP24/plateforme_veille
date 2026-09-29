import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request as ExpressRequest, Response } from 'express';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  private setCookies(response: Response, accessToken: string, refreshToken: string) {
    const common = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
    };
    response.cookie('access_token', accessToken, {
      ...common,
      maxAge: this.authService.accessTtlSeconds * 1000,
      path: '/',
    });
    response.cookie('refresh_token', refreshToken, {
      ...common,
      maxAge: this.authService.refreshTtlSeconds * 1000,
      path: '/api/v1/auth',
    });
  }

  private clearCookies(response: Response) {
    const common = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
    };
    response.clearCookie('access_token', { ...common, path: '/' });
    response.clearCookie('refresh_token', { ...common, path: '/api/v1/auth' });
  }

  @Post('login')
  async login(
    @Body()
    dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto);
    this.setCookies(response, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Post('refresh')
  async refresh(
    @Req() request: ExpressRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.refresh(request.cookies?.refresh_token);
    this.setCookies(response, result.accessToken, result.refreshToken);
    return { message: 'Session renouvelée.' };
  }

  @Post('logout')
  async logout(
    @Req() request: ExpressRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      await this.authService.logout(request.cookies?.refresh_token);
    } finally {
      this.clearCookies(response);
    }
    return { message: 'Déconnexion réussie.' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() request: any) {
    return request.user;
  }
}
