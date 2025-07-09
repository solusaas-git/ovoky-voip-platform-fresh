import nodemailer from 'nodemailer';
import { connectToDatabase } from '@/lib/db';
import SmtpSettingsModel from '@/models/SmtpSettings';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  username?: string;
  password?: string;
  fromEmail: string;
  fromName?: string;
  enabled: boolean;
}

async function getSmtpSettings(): Promise<SmtpSettings | null> {
  try {
    await connectToDatabase();
    const settings = await SmtpSettingsModel.findOne().lean();
    return settings as SmtpSettings;
  } catch (error) {
    console.error('Error fetching SMTP settings:', error);
    return null;
  }
}

export async function sendEmail(options: EmailOptions): Promise<{ fromEmail: string }> {
  try {
    // Get SMTP settings
    const smtpSettings = await getSmtpSettings();
    if (!smtpSettings || !smtpSettings.enabled) {
      throw new Error('SMTP not configured or disabled');
    }

    console.log(`Preparing to send email to ${options.to} using SMTP:`, {
      host: smtpSettings.host,
      port: smtpSettings.port,
      secure: smtpSettings.secure,
      hasUsername: !!smtpSettings.username,
      hasPassword: !!smtpSettings.password,
      fromEmail: smtpSettings.fromEmail,
      fromName: smtpSettings.fromName
    });

    const transporter = nodemailer.createTransport({
      host: smtpSettings.host,
      port: smtpSettings.port,
      secure: smtpSettings.secure,
      auth: smtpSettings.username && smtpSettings.password ? {
        user: smtpSettings.username,
        pass: smtpSettings.password,
      } : undefined,
      connectionTimeout: 10000,
      socketTimeout: 10000,
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify connection before sending
    console.log(`Verifying SMTP connection for ${options.to}...`);
    await transporter.verify();
    console.log(`SMTP connection verified for ${options.to}`);

    await transporter.sendMail({
      from: smtpSettings.fromName ? `"${smtpSettings.fromName}" <${smtpSettings.fromEmail}>` : smtpSettings.fromEmail,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    });

    console.log(`Email sent successfully to ${options.to}`);
    
    // Return the fromEmail that was used
    return { fromEmail: smtpSettings.fromEmail };
  } catch (error) {
    console.error(`Error sending email to ${options.to}:`, error);
    throw error;
  }
} 