import { describe, expect, it } from 'vitest';
import {
  AUDIT_IP,
  accessBudgets,
  clientIp,
  hostOf,
  INTAKE,
  plainText,
  retryAfterSeconds,
  robotBudgets,
} from '../src/abus.js';

describe('plafonds anti-abus', () => {
  it('laisse passer un usage normal et coupe la rafale', () => {
    expect(AUDIT_IP.limit).toBeGreaterThanOrEqual(30);
    expect(INTAKE.access.account.limit).toBeGreaterThanOrEqual(5);
    expect(INTAKE.robot.domain.limit).toBeGreaterThanOrEqual(4);
    expect(INTAKE.access.ip.limit).toBeGreaterThan(INTAKE.access.account.limit);
  });

  it('compte la demande d’accès par IP, par e-mail et par compte', () => {
    const rows = accessBudgets({
      ip: '203.0.113.8',
      email: 'ada@exemple.fr',
      userId: '11111111-1111-4111-8111-111111111111',
    });
    expect(rows.map((row) => row.scope)).toEqual([
      'access-ip',
      'access-mail',
      'access-user',
    ]);
    expect(
      accessBudgets({
        ip: 'local',
        email: 'ada@exemple.fr',
        userId: 'pas-un-compte',
      }).some((row) => row.scope === 'access-user'),
    ).toBe(false);
  });

  it('compte le robot par IP, par e-mail, par domaine et par compte', () => {
    const rows = robotBudgets({
      ip: '203.0.113.8',
      email: 'ada@exemple.fr',
      domain: 'exemple.fr',
      userId: null,
    });
    expect(rows.map((row) => row.scope)).toEqual([
      'robot-ip',
      'robot-mail',
      'robot-domain',
    ]);
  });

  it('lit l’IP Netlify avant l’en-tête transmissible', () => {
    const req = new Request('http://localhost/', {
      headers: {
        'x-nf-client-connection-ip': '203.0.113.9',
        'x-forwarded-for': '198.51.100.2, 10.0.0.1',
      },
    });
    expect(clientIp(req)).toBe('203.0.113.9');
    expect(
      clientIp(
        new Request('http://localhost/', {
          headers: { 'x-forwarded-for': ' 198.51.100.2 , 10.0.0.1' },
        }),
      ),
    ).toBe('local');
    expect(clientIp(new Request('http://localhost/'))).toBe('local');
    expect(
      clientIp(
        new Request('http://localhost/', {
          headers: { 'x-forwarded-for': '203.0.113.8' },
        }),
      ),
    ).toBe('local');
  });

  it('normalise le domaine et refuse l’hôte local', () => {
    expect(hostOf('https://Exemple.FR/a')).toBe('exemple.fr');
    expect(hostOf('exemple.fr.')).toBe('exemple.fr');
    expect(hostOf('localhost')).toBeNull();
    expect(hostOf('http://127.0.0.1')).toBeNull();
    expect(hostOf('')).toBeNull();
  });

  it('annonce le temps restant dans la fenêtre', () => {
    const windowMs = 60 * 60 * 1000;
    const now = 1_700_000_000_000;
    const left = retryAfterSeconds(now, windowMs);
    expect(left).toBeGreaterThan(0);
    expect(left).toBeLessThanOrEqual(windowMs / 1000);
  });

  it('retire les caractères de contrôle du motif', () => {
    expect(plainText('bonjour\nmonde', 20)).toBe('bonjourmonde');
  });
});
