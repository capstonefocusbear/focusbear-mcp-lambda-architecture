// Domain constants (Preset A)
export const EFFORT_MINUTES_PER_RUNWAY_DAY = 60; // 1 hour ≍ 1 runway day
export const SCORE_TODAY = 9;
export const SCORE_PAST_DUE = 10;
export const SCORE_FLOOR = 0.1;

const MS_PER_DAY = 86_400_000;
const NUMERIC_STABILITY_EPS = 1e-9;
const MIN_EFFORT_DIVISOR_MINUTES = 1;

// ---- Date helpers -----------------------------------------------------------
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const daysUntilDue = (due: Date, now = new Date()): number =>
  (startOfDay(due).getTime() - startOfDay(now).getTime()) / MS_PER_DAY;

// ---- Perspiration level to minutes conversion ------------------------------
export const perspirationLevelToMinutes = (level: number): number => {
  const mapping: { [key: number]: number } = {
    1: 5, // 5 minute job
    2: 15, // 15 minutes work
    3: 30, // Half an hour
    4: 60, // An hour
    5: 240, // Half a day
    6: 240, // Half a day
    7: 480, // A day
    8: 480, // A day
    9: 3360, // A week
    10: 3360, // A week
  };
  return mapping[level] || 5; // Default to 5 minutes for unknown levels
};

// ---- Base urgency (logarithmic formula from original proposal) -------------------
export const baseUrgency = (days: number): number => {
  return Math.max(0.1, 8 - Math.log(days + 1) * 1.5);
};

// ---- Workload factor (0..1): share of runway consumed by this effort --------
export const workloadShareOfRunway = (effortMinutes: number, days: number): number => {
  const minutes = Math.max(0, effortMinutes);
  const runwayMinutes = Math.max(0, days) * EFFORT_MINUTES_PER_RUNWAY_DAY;
  return minutes / Math.max(NUMERIC_STABILITY_EPS, minutes + runwayMinutes);
};

// ---- Final time-pressure score -----------------------------------
export const timePressureScore = (due: Date | string, effortMinutes = 0): number => {
  // Handle null/undefined due dates
  if (!due) return SCORE_FLOOR;

  const dueDate = new Date(due as any);
  if (Number.isNaN(dueDate.getTime())) return SCORE_FLOOR;

  const days = daysUntilDue(dueDate);

  // Handle overdue tasks: base score + 1 point per overdue day
  if (days < 0) {
    const overdueDays = Math.abs(days);
    const baseScore = SCORE_PAST_DUE; // 10 points
    const overduePenalty = overdueDays; // No cap - keep adding +1 for each day
    return baseScore + overduePenalty;
  }

  if (days === 0) return SCORE_TODAY;

  // Use the exact formula from original proposal
  const base = baseUrgency(days);
  const modifier = workloadShareOfRunway(effortMinutes, days);
  return Math.max(SCORE_FLOOR, (base / 8) * 10 * modifier);
};

// ---- TOP score (unchanged structure) ---------------------------------------
export const topScore = (due: Date | string, outcome: number, effortMinutes: number): number =>
  (timePressureScore(due, effortMinutes) * outcome) / Math.max(MIN_EFFORT_DIVISOR_MINUTES, effortMinutes);
