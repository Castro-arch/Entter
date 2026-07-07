import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

export interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  attachment?: { filename: string; content: Buffer; contentType: string };
}

/**
 * Thin wrapper around `nodemailer`.
 *
 * When `SMTP_HOST` is not configured the service runs in **dev mode**: it
 * logs what would have been sent instead of calling out to a real mail
 * server, so the certificate flow can be exercised locally without SMTP
 * credentials — same pattern as `AsaasService` for payments.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    this.from = config.get<string>('SMTP_FROM', 'no-reply@entter.local');
    const user = config.get<string>('SMTP_USER');

    this.transporter = host
      ? nodemailer.createTransport({
          host,
          port: config.get<number>('SMTP_PORT', 587),
          auth: user ? { user, pass: config.get<string>('SMTP_PASS') } : undefined,
        })
      : null;
  }

  get isConfigured(): boolean {
    return this.transporter !== null;
  }

  async send(params: SendEmailParams): Promise<void> {
    if (!this.transporter) {
      const attachmentNote = params.attachment
        ? ` with attachment ${params.attachment.filename} (${params.attachment.content.length} bytes)`
        : '';
      this.logger.warn(
        `SMTP_HOST not set — dev mode, not sending to ${params.to}: "${params.subject}"${attachmentNote}`,
      );
      return;
    }

    await this.transporter.sendMail({
      from: this.from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      attachments: params.attachment
        ? [
            {
              filename: params.attachment.filename,
              content: params.attachment.content,
              contentType: params.attachment.contentType,
            },
          ]
        : undefined,
    });
  }
}
