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
 */
export function getMealSessionStatus(startTime: string): MealSessionStatus {
  const now = new Date();
  
  // Parse session start time for today
  const [hours, minutes] = startTime.split(':').map(Number);
  const sessionStart = new Date();
  sessionStart.setHours(hours, minutes || 0, 0, 0);

  const diffMs = sessionStart.getTime() - now.getTime();
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
