import { type Transporter } from 'nodemailer';

export async function sendVerificationEmail(
  transporter: Transporter,
  from: string,
  to: string,
  verificationLink: string,
): Promise<void> {
  await transporter.sendMail({
    from,
    to,
    subject: 'Verify your email',
    html: `<p>Click to verify: <a href="${verificationLink}">Verify email</a></p>`,
  });
}

export async function sendPasswordResetEmail(
  transporter: Transporter,
  from: string,
  to: string,
  resetLink: string,
): Promise<void> {
  await transporter.sendMail({
    from,
    to,
    subject: 'Reset your password',
    html: `<p>Click to reset your password: <a href="${resetLink}">Reset password</a></p>
           <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
  });
}
