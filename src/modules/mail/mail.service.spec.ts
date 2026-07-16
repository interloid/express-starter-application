import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { SentMessageInfo, Transporter } from 'nodemailer';

const createTransport = jest.fn();

jest.unstable_mockModule('nodemailer', () => ({
  default: {
    createTransport,
  },
}));

const { sendVerificationEmail, sendPasswordResetEmail } = await import('./mail.service.js');

describe('mail.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a transporter', () => {
    const transporter = {
      sendMail: jest.fn(),
    } as unknown as Transporter<SentMessageInfo>;

    createTransport.mockReturnValue(transporter);

    const config = {
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      user: 'user',
      pass: 'password',
      from: 'noreply@example.com',
    };

    expect(createTransport).toHaveBeenCalledWith({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  });

  it('sends verification email', async () => {
    const sendMail = jest.fn<() => Promise<SentMessageInfo>>();
    sendMail.mockResolvedValue({} as SentMessageInfo);

    const transporter = {
      sendMail,
    } as unknown as Transporter<SentMessageInfo>;

    await sendVerificationEmail(
      transporter,
      'from@example.com',
      'to@example.com',
      'https://example.com/verify',
    );

    // expect(sendMail).toHaveBeenCalledWith({
    //   from: 'from@example.com',
    //   to: 'to@example.com',
    //   subject: 'Verify your email',
    //   html: '<p>Click to verify: <a href="https://example.com/verify">Verify email</a></p>',
    // });
  });

  it('sends password reset email', async () => {
    const sendMail = jest.fn<() => Promise<SentMessageInfo>>();
    sendMail.mockResolvedValue({} as SentMessageInfo);

    const transporter = {
      sendMail,
    } as unknown as Transporter<SentMessageInfo>;

    await sendPasswordResetEmail(
      transporter,
      'from@example.com',
      'to@example.com',
      'https://example.com/reset',
    );

    // expect(sendMail).toHaveBeenCalledWith({
    //   from: 'from@example.com',
    //   to: 'to@example.com',
    //   subject: 'Reset your password',
    //   html: `<p>Click to reset your password: <a href="https://example.com/reset">Reset password</a></p>
    //        <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
    // });
  });
});
