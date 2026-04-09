import { getLocale, translate } from '../app/i18n';
import type { ResolvedLanguage } from '../app/types';

export function formatRelativeDate(value: string | null, language: ResolvedLanguage): string {
  if (!value) {
    return translate(language, 'relativeNever');
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return translate(language, 'relativeUnknown');
  }

  const diff = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const locale = getLocale(language);

  if (diff < minute) {
    return translate(language, 'relativeJustNow');
  }

  if (diff < hour) {
    const minutes = Math.max(1, Math.round(diff / minute));
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-minutes, 'minute');
  }

  if (diff < day) {
    const hours = Math.max(1, Math.round(diff / hour));
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-hours, 'hour');
  }

  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: diff > 365 * day ? 'numeric' : undefined,
  }).format(date);
}

export function formatStack(stack: string[]): string {
  return stack.length > 0 ? stack.join(' · ') : 'Unclassified';
}

export function joinLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
