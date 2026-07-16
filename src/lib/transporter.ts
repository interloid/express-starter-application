import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.config.js';

export const transporter: Transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465 ? true : false,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
});
