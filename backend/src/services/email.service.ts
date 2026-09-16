import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

const RESEND_API_URL = 'https://api.resend.com/emails';

class EmailService {
  private sesClient: SESClient | null = null;
  private isSes: boolean = false;
  private isResend: boolean = false;

  constructor() {
    if (env.resendApiKey) {
      this.isResend = true;
      logger.info(`EmailService: Resend enabled (from: ${env.emailFrom})`);
    } else if (env.enableSes) {
      const clientConfig: {
        region: string;
        credentials?: { accessKeyId: string; secretAccessKey: string };
      } = {
        region: env.awsSesRegion,
      };

      if (env.awsAccessKeyId && env.awsSecretAccessKey) {
        clientConfig.credentials = {
          accessKeyId: env.awsAccessKeyId,
          secretAccessKey: env.awsSecretAccessKey,
        };
      }

      this.sesClient = new SESClient(clientConfig);
      this.isSes = true;
      logger.info(`EmailService: AWS SES enabled (region: ${env.awsSesRegion}, from: ${env.emailFrom})`);
    } else {
      logger.info('EmailService: Local development simulation enabled (SES disabled)');
    }
  }

  public isSesEnabled(): boolean {
    return this.isSes;
  }

  public isResendEnabled(): boolean {
    return this.isResend;
  }

  private async sendViaResend(email: EmailPayload, from: string): Promise<void> {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [email.to],
        subject: email.subject,
        text: email.body,
        ...(email.html ? { html: email.html } : {}),
      }),
    });

    if (!res.ok) {
      // Resend's error body names the actual problem (e.g. unverified
      // domain) - surface it rather than a generic failure.
      const detail = await res.text().catch(() => '');
      throw new Error(`Resend API error (${res.status}): ${detail}`);
    }

    logger.info(`[RESEND EMAIL SENT] To: ${email.to} | Subject: ${email.subject}`);
  }

  public async send(email: EmailPayload, fromOverride?: string): Promise<void> {
    if (this.isResend) {
      await this.sendViaResend(email, fromOverride ?? env.emailFrom);
      return;
    }

    if (this.isSes && this.sesClient) {
      try {
        const command = new SendEmailCommand({
          Source: env.emailFrom,
          Destination: {
            ToAddresses: [email.to],
          },
          Message: {
            Subject: {
              Data: email.subject,
              Charset: 'UTF-8',
            },
            Body: {
              Text: {
                Data: email.body,
                Charset: 'UTF-8',
              },
              ...(email.html
                ? {
                    Html: {
                      Data: email.html,
                      Charset: 'UTF-8',
                    },
                  }
                : {}),
            },
          },
        });

        await this.sesClient.send(command);
        // In production, log only non-sensitive metadata; never log token URLs.
        logger.info(`[SES EMAIL SENT] To: ${email.to} | Subject: ${email.subject}`);
      } catch (err) {
        logger.error(`[SES EMAIL ERROR] Failed to send email to ${email.to}`, err);
        throw err;
      }
      return;
    }

    // Local-first development simulation: logs link for manual testing
    logger.info(`[DEV EMAIL SIMULATION] To: ${email.to} | Subject: ${email.subject}\n${email.body}`);
  }
}

const emailServiceInstance = new EmailService();

export async function sendEmail(email: EmailPayload, fromOverride?: string): Promise<void> {
  await emailServiceInstance.send(email, fromOverride);
}

export function verificationEmail(link: string): { subject: string; body: string; html: string } {
  return {
    subject: 'Verify your Social Cup email',
    body: `Welcome to Social Cup!\n\nPlease verify your email by visiting:\n${link}\n\nThis link expires in 24 hours. If you did not create an account, you can safely ignore this email.`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #FAF8F5; color: #2D2422; padding: 24px; margin: 0; }
            .card { max-width: 540px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; padding: 32px; border: 1px solid #EAE5DF; }
            .logo { font-size: 24px; font-weight: bold; color: #6F4E37; margin-bottom: 20px; }
            .btn { display: inline-block; background-color: #6F4E37; color: #FFFFFF !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; margin: 24px 0; }
            .footer { font-size: 13px; color: #8C827A; margin-top: 32px; border-top: 1px solid #EAE5DF; padding-top: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">☕ Social Cup Dallas</div>
            <h2>Verify Your Email</h2>
            <p>Welcome to Social Cup! Please confirm your email address to activate all member privileges and start redeeming coffee credits.</p>
            <a href="${link}" class="btn">Verify Email Address</a>
            <p style="font-size: 13px; color: #8C827A;">This verification link expires in 24 hours.<br>If the button above does not work, copy and paste this URL into your browser:<br><a href="${link}" style="color: #6F4E37;">${link}</a></p>
            <div class="footer">
              If you did not sign up for a Social Cup account, no further action is required.
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

export function passwordResetEmail(link: string): { subject: string; body: string; html: string } {
  return {
    subject: 'Reset your Social Cup password',
    body: `Someone requested a password reset for your Social Cup account.\n\nOpen this link to choose a new password:\n${link}\n\nThis link expires in 1 hour. If you did not request this, you can ignore this email.`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #FAF8F5; color: #2D2422; padding: 24px; margin: 0; }
            .card { max-width: 540px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; padding: 32px; border: 1px solid #EAE5DF; }
            .logo { font-size: 24px; font-weight: bold; color: #6F4E37; margin-bottom: 20px; }
            .btn { display: inline-block; background-color: #6F4E37; color: #FFFFFF !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; margin: 24px 0; }
            .footer { font-size: 13px; color: #8C827A; margin-top: 32px; border-top: 1px solid #EAE5DF; padding-top: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">☕ Social Cup Dallas</div>
            <h2>Password Reset Request</h2>
            <p>We received a request to reset the password associated with your Social Cup account. Click the button below to choose a new password:</p>
            <a href="${link}" class="btn">Reset Password</a>
            <p style="font-size: 13px; color: #8C827A;">This reset link expires in 1 hour for your security.<br>If the button above does not work, copy and paste this URL into your browser:<br><a href="${link}" style="color: #6F4E37;">${link}</a></p>
            <div class="footer">
              If you didn't request a password reset, you can safely ignore this email. Your password will not change.
            </div>
          </div>
        </body>
      </html>
    `,
  };
}
