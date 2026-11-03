import { describe, expect, it } from 'vitest';
import { createBrevoMailer } from '../src/mail.js';

describe('en-têtes de courriel', () => {
  it('refuse un destinataire ou un sujet avec un retour à la ligne', async () => {
    let called = 0;
    const mailer = createBrevoMailer({
      apiKey: 'brevo-test-key-0123456789abcd',
      senderEmail: 'bonjour@audigy.test',
      fetch: async () => {
        called += 1;
        return new Response(null, { status: 201 });
      },
    });
    const message = {
      to: 'ada@exemple.fr',
      subject: 'Sujet',
      text: 'Bonjour',
      html: '<p>Bonjour</p>',
      unsubscribeUrl: 'https://audigy.test/api/unsubscribe?user=1&token=ab',
    };
    await expect(
      mailer.send({
        ...message,
        to: 'ada@exemple.fr\r\nBcc: pirate@exemple.fr',
      }),
    ).rejects.toThrow('mail_header');
    await expect(
      mailer.send({ ...message, subject: 'Sujet\nBcc: pirate@exemple.fr' }),
    ).rejects.toThrow('mail_header');
    expect(called).toBe(0);
  });
});
