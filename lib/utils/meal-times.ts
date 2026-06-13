/**
 * Utility for meal session timing and cutoff logic.
 */

export interface MealSessionStatus {
  isClosed: boolean;
  timeLeft: string; // e.g. "02:45:10"
  secondsLeft: number;
}

export type MealWindowStatus = 'open' | 'ended' | 'not_opened';

/**
 * Calculates if a meal booking is closed and how much time remains.
 * @param startTime string - format "HH:mm:ss" or "HH:mm"
 * @param timezone string - e.g. "Asia/Kolkata" or "UTC"
 */
export function getMealSessionStatus(startTime: string, timezone: string = 'UTC'): MealSessionStatus {
  if (!startTime) {
    return { isClosed: true, timeLeft: '00:00:00', secondsLeft: 0 };
  }

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

  const year = Number(getPart('year'));
  const month = Number(getPart('month'));
  const day = Number(getPart('day'));
  let hour = Number(getPart('hour'));
  const minute = Number(getPart('minute'));
  const second = Number(getPart('second'));

  // Handle "24" hour format which some environments return for midnight
  if (hour === 24) hour = 0;

  // Create a Date object representing "now" in the target timezone components
  const localNow = new Date(year, month - 1, day, hour, minute, second);

  // 2. Parse session start time
  const timeParts = startTime.split(':').map(Number);
  const sHour = timeParts[0];
  const sMin = timeParts[1] || 0;
  
  if (isNaN(sHour)) {
    return { isClosed: true, timeLeft: '00:00:00', secondsLeft: 0 };
  }

  const sessionStart = new Date(year, month - 1, day, sHour, sMin, 0, 0);

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

/**
 * Determines the window status for all meal slots.
 * Updated: Windows are now independent. A user can book any meal 
 * whose deadline (start time) has not passed.
 */
export function getMealSequenceStatus(
  settings: { breakfast_start: string; lunch_start: string; dinner_start: string; timezone: string }
): Record<string, { windowStatus: MealWindowStatus; timeLeft: string }> {
  const bf = getMealSessionStatus(settings.breakfast_start, settings.timezone);
  const ln = getMealSessionStatus(settings.lunch_start, settings.timezone);
  const dn = getMealSessionStatus(settings.dinner_start, settings.timezone);

  return {
    breakfast: {
      windowStatus: bf.isClosed ? 'ended' : 'open',
      timeLeft: bf.timeLeft
    },
    lunch: {
      windowStatus: ln.isClosed ? 'ended' : 'open',
      timeLeft: ln.timeLeft
    },
    dinner: {
      windowStatus: dn.isClosed ? 'ended' : 'open',
      timeLeft: dn.timeLeft
    }
  };
}
