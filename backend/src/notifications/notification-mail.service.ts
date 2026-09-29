import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { WatchItem } from '../watch-items/entities/watch-item.entity';
import { renderPublicationEmail } from './publication-email';

@Injectable()
export class NotificationMailService {
  get isConfigured(): boolean {
    return Boolean(process.env.SMTP_USER && process.env.SMTP_APP_PASSWORD);
  }

  async sendPublication(recipient: string, item: WatchItem): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('Identifiants Gmail non configurés.');
    }

    const user = process.env.SMTP_USER!;
    const password = process.env.SMTP_APP_PASSWORD!;
    const frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
      .split(',')[0].trim();
    const message = renderPublicationEmail(item, frontendUrl);
    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass: password },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });

    await transport.sendMail({
      from: { name: 'Veille', address: user },
      to: recipient,
      ...message,
    });
  }
}
