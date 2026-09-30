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

  async sendPasswordReset(recipient: string, token: string): Promise<void> {
    if (!this.isConfigured) throw new Error('Identifiants Gmail non configurés.');
    const user = process.env.SMTP_USER!;
    const frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:5173').split(',')[0].trim();
    const link = new URL('/reset-password', frontendUrl);
    link.searchParams.set('token', token);
    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass: process.env.SMTP_APP_PASSWORD! },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
    await transport.sendMail({
      from: { name: 'Veille', address: user },
      to: recipient,
      subject: 'Réinitialisation de votre mot de passe - Veille',
      text: `Vous avez demandé un nouveau mot de passe. Ouvrez ce lien dans les 15 minutes : ${link.toString()}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
      html: `<p>Vous avez demandé un nouveau mot de passe.</p><p><a href="${link.toString()}">Créer un nouveau mot de passe</a></p><p>Ce lien expire dans 15 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>`,
    });
  }

  async sendPasswordChanged(recipient: string): Promise<void> {
    if (!this.isConfigured) throw new Error('Identifiants Gmail non configurés.');
    const user = process.env.SMTP_USER!;
    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass: process.env.SMTP_APP_PASSWORD! },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
    await transport.sendMail({
      from: { name: 'Veille', address: user },
      to: recipient,
      subject: 'Votre mot de passe a été modifié - Veille',
      text: `Bonjour,\n\nLe mot de passe de votre compte Veille a été modifié avec succès. Vous pouvez désormais vous connecter avec votre nouveau mot de passe.\n\nSi vous n'êtes pas à l'origine de cette modification, contactez immédiatement l'administrateur de la plateforme.\n\nL'équipe Veille`,
      html: `<p>Bonjour,</p><p>Le mot de passe de votre compte Veille a été modifié avec succès. Vous pouvez désormais vous connecter avec votre nouveau mot de passe.</p><p>Si vous n'êtes pas à l'origine de cette modification, contactez immédiatement l'administrateur de la plateforme.</p><p>L'équipe Veille</p>`,
    });
  }
}
