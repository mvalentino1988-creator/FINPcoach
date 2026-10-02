import { DayOfWeekNum } from '../types';

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function parseData(testo: string): string | null {
  if (!testo) return null;
  const t = testo.trim();
  
  // Try DD/MM/YYYY
  const itMatch = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (itMatch) {
    const day = parseInt(itMatch[1], 10);
    const month = parseInt(itMatch[2], 10);
    const year = parseInt(itMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${pad2(month)}-${pad2(day)}`;
    }
    return null;
  }

  // Try YYYY-MM-DD
  const isoMatch = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${pad2(month)}-${pad2(day)}`;
    }
    return null;
  }

  return null;
}

export function formattaData(isoDate: string | null | undefined): string {
  if (!isoDate) return '';
  const parsed = parseData(isoDate);
  if (!parsed) return isoDate;
  const [y, m, d] = parsed.split('-');
  return `${d}/${m}/${y}`;
}

export function toDateObj(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayISO(): string {
  const now = new Date();
  return toISO(now);
}

export function addDays(iso: string, days: number): string {
  const d = toDateObj(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export function addWeeks(iso: string, weeks: number): string {
  return addDays(iso, weeks * 7);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const d1 = toDateObj(fromIso);
  const d2 = toDateObj(toIso);
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

export function weeksBetween(fromIso: string, toIso: string): number {
  return Math.floor(daysBetween(fromIso, toIso) / 7);
}

export function yearsBetween(birthIso: string, asOfIso: string): number {
  const b = toDateObj(birthIso);
  const a = toDateObj(asOfIso);
  let age = a.getFullYear() - b.getFullYear();
  const m = a.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && a.getDate() < b.getDate())) {
    age--;
  }
  return age;
}

// 1 = Monday, ..., 7 = Sunday
export function getDayOfWeek(iso: string): DayOfWeekNum {
  const d = toDateObj(iso);
  const day = d.getDay();
  return (day === 0 ? 7 : day) as DayOfWeekNum;
}

export function previousOrSameMonday(iso: string): string {
  const dow = getDayOfWeek(iso);
  const diff = dow - 1;
  return addDays(iso, -diff);
}

export function nextOrSameSunday(iso: string): string {
  const dow = getDayOfWeek(iso);
  const diff = 7 - dow;
  return addDays(iso, diff);
}

export function nextOrSameMonday(iso: string): string {
  const dow = getDayOfWeek(iso);
  if (dow === 1) return iso;
  const diff = 8 - dow;
  return addDays(iso, diff);
}

export function setDayOfWeekInWeek(mondayIso: string, targetDow: DayOfWeekNum): string {
  return addDays(mondayIso, targetDow - 1);
}

export function isBefore(iso1: string, iso2: string): boolean {
  return iso1 < iso2;
}

export function isAfter(iso1: string, iso2: string): boolean {
  return iso1 > iso2;
}

export function isEqual(iso1: string, iso2: string): boolean {
  return iso1 === iso2;
}

export function isInRange(target: string, start: string, end: string): boolean {
  return !isBefore(target, start) && !isAfter(target, end);
}
