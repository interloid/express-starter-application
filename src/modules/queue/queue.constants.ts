// queue/queue.constants.ts
export const MAIL_QUEUE = 'mail';

export type MailJob =
  | { kind: 'email-verification'; to: string; link: string }
  | { kind: 'password-reset'; to: string; link: string };
