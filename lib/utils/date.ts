import {
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  parseISO,
  isWithinInterval,
  startOfDay,
  eachDayOfInterval,
} from 'date-fns';

/**
 * Gets the start of the current week (Wednesday)
 */
export function getWeekStart(date: Date = new Date()): Date {
  // In date-fns, weeks start on Sunday (0), Monday (1), ..., Saturday (6)
  // Wednesday is 3
  return startOfDay(startOfWeek(date, { weekStartsOn: 3 }));
}

/**
 * Gets the end of the current week (Tuesday)
 */
export function getWeekEnd(date: Date = new Date()): Date {
  // End of week when starting on Wednesday
  return startOfDay(endOfWeek(date, { weekStartsOn: 3 }));
}

/**
 * Gets all days in a week (Wed-Tue) as an array of Date objects
 */
export function getDaysInWeek(weekStart: Date): Date[] {
  const weekEnd = addDays(weekStart, 6); // 7 days total
  return eachDayOfInterval({ start: weekStart, end: weekEnd });
}

/**
 * Formats a date as YYYY-MM-DD for database storage
 */
export function formatDateForDB(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Formats a date for display (e.g., "Wed, Jan 28")
 */
export function formatDateForDisplay(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'EEE, MMM d');
}

/**
 * Formats a date for full display (e.g., "Wednesday, January 28, 2026")
 */
export function formatDateFull(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'EEEE, MMMM d, yyyy');
}

/**
 * Gets the week range as a formatted string (e.g., "Jan 28 - Feb 3")
 */
export function getWeekRangeString(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
}

/**
 * Checks if a date is within a given week
 */
export function isDateInWeek(date: Date, weekStart: Date): boolean {
  const weekEnd = addDays(weekStart, 6);
  return isWithinInterval(date, { start: weekStart, end: weekEnd });
}

/**
 * Gets the day name from a date (e.g., "Wednesday")
 */
export function getDayName(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'EEEE');
}

/**
 * Gets the short day name from a date (e.g., "Wed")
 */
export function getShortDayName(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'EEE');
}

/**
 * Gets the week number of the year
 */
export function getWeekNumber(date: Date): number {
  const weekStart = getWeekStart(date);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const weeksDiff = Math.floor((weekStart.getTime() - yearStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return weeksDiff + 1;
}
