/**
 * Utility for meal session timing and cutoff logic.
 */

export interface MealSessionStatus {
  isClosed: boolean;
  timeLeft: string; // e.g. "02:45:10"
  secondsLeft: number;
}

/**
 * Calculates if a meal booking is closed and how much time remains.
 * @param startTime string - format "HH:mm:ss" or "HH:mm"
 * @param timezone string - e.g. "Asia/Kolkata" or "UTC"
 */
export function getMealSessionStatus(startTime: string, timezone: string = 'UTC'): MealSessionStatus {
  // 1. Get current time in the target timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });

  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value;

  // Create a Date object representing "now" in the target timezone
  const localNow = new Date(
    Number(getPart('year')),
    Number(getPart('month')) - 1,
    Number(getPart('day')),
    Number(getPart('hour')),
    Number(getPart('minute')),
    Number(getPart('second'))
  );

  // 2. Parse session start time
  const [hours, minutes] = startTime.split(':').map(Number);
  const sessionStart = new Date(
    Number(getPart('year')),
    Number(getPart('month')) - 1,
    Number(getPart('day')),
    hours,
    minutes || 0,
    0,
    0
  );

  const diffMs = sessionStart.getTime() - localNow.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec <= 0) {
    return { isClosed: true, timeLeft: '00:00:00', secondsLeft: 0 };
  }

  const h = Math.floor(diffSec / 3600);
  const m = Math.floor((diffSec % 3600) / 60);
  const s = diffSec % 60;

  const timeLeft = [
    h.toString().padStart(2, '0'),
    m.toString().padStart(2, '0'),
    s.toString().padStart(2, '0')
  ].join(':');

  return {
    isClosed: false,
    timeLeft,
    secondsLeft: diffSec
  };
}
