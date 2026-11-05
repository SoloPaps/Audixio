/**
 * Nombres, durées et dates en français (Europe/Paris), en anglais (en-GB)
 * quand le dictionnaire anglais est posé.
 */

import { packActive } from './pack.js';

const numberFormat = new Intl.NumberFormat('fr-FR');
const numberFormatEn = new Intl.NumberFormat('en-GB');

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Europe/Paris',
});

/** « 1 234 » — espace fine insécable, convention fr-FR (« 1,234 » en anglais). */
export function formatNumber(value: number): string {
  return (packActive() ? numberFormatEn : numberFormat).format(value);
}

/**
 * Nombre à décimales fixes : « 72,0 », ou « 72.0 » quand le dictionnaire
 * anglais est posé.
 */
export function formatFixed(value: number, digits: number): string {
  const fixed = value.toFixed(digits);
  return packActive() ? fixed : fixed.replace('.', ',');
}

/** « 3,5 s ». */
export function formatDuration(seconds: number): string {
  return `${formatNumber(seconds)} s`;
}

const dateFormatEn = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Europe/Paris',
});

/**
 * « 23 oct. 2026 », fuseau Europe/Paris. Jour civil seulement.
 * « 23 Oct 2026 » quand le dictionnaire anglais est posé.
 */
export function formatDate(date: Date): string {
  return packActive() ? dateFormatEn.format(date) : dateFormat.format(date);
}

/** Date de page : même rendu que formatDate. */
export function formatPageDate(date: Date): string {
  return formatDate(date);
}

const clockFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  hour: 'numeric',
  minute: '2-digit',
  hourCycle: 'h23',
});

/**
 * « 23 oct. 2026, 14 h 30 », fuseau Europe/Paris.
 * Heure sur 24 h, minutes toujours présentes. « 23 Oct 2026, 14:30 » en anglais.
 */
export function formatDateTime(date: Date): string {
  const parts = clockFormat.formatToParts(date);
  const hourRaw = parts.find((part) => part.type === 'hour')?.value ?? '0';
  const minuteRaw = parts.find((part) => part.type === 'minute')?.value ?? '00';
  let hour = Number(hourRaw);
  if (!Number.isFinite(hour) || hour === 24) hour = 0;
  const minute = minuteRaw.replace(/\D/gu, '').padStart(2, '0').slice(-2);
  if (packActive()) {
    return `${formatDate(date)}, ${String(hour).padStart(2, '0')}:${minute}`;
  }
  return `${formatDate(date)}, ${hour} h ${minute}`;
}
