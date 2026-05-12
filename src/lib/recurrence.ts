// Recurrence utilities for meetings.
// Generates future occurrence dates based on recurrence configuration.

export type RecurrenceConfig = {
  recurrence: "diaria" | "semanal" | "mensal" | null;
  recurrence_interval?: number | null;
  recurrence_days?: string[] | null; // for weekly: ["mon","tue",...]
  recurrence_monthly_mode?: string | null; // "day_of_month" | "weekday_of_month"
  recurrence_end_type?: string | null; // "never" | "date" | "count"
  recurrence_end_date?: string | null; // YYYY-MM-DD
  recurrence_count?: number | null;
};

export type GenerateOccurrencesOptions = {
  until?: Date;
  maxOccurrences?: number;
};

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
export const WEEKDAYS_PT: { key: string; label: string }[] = [
  { key: "mon", label: "Seg" },
  { key: "tue", label: "Ter" },
  { key: "wed", label: "Qua" },
  { key: "thu", label: "Qui" },
  { key: "fri", label: "Sex" },
  { key: "sat", label: "Sáb" },
  { key: "sun", label: "Dom" },
];

// Hard cap to avoid infinite loops on "never" end type.
const MAX_OCCURRENCES = 1500;
const MAX_HORIZON_DAYS = 365 * 2;

function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function addMonths(d: Date, n: number) { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; }

function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date | null {
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  const day = 1 + offset + (n - 1) * 7;
  const d = new Date(year, month, day);
  if (d.getMonth() !== month) return null;
  return d;
}

/**
 * Generate occurrence start times AFTER the seed, based on config.
 * Returns Date[] of additional occurrences (does not include the seed itself).
 */
export function generateOccurrences(
  seed: Date,
  cfg: RecurrenceConfig,
  options: GenerateOccurrencesOptions = {},
): Date[] {
  if (!cfg.recurrence) return [];
  const interval = Math.max(1, cfg.recurrence_interval ?? 1);
  const endType = cfg.recurrence_end_type ?? "never";
  const endDate = cfg.recurrence_end_date ? new Date(cfg.recurrence_end_date + "T23:59:59") : null;
  const maxOccurrences = Math.max(1, options.maxOccurrences ?? MAX_OCCURRENCES);
  // Total includes the seed; so additional = count - 1
  const targetCount = endType === "count" ? Math.max(1, (cfg.recurrence_count ?? 1)) - 1 : maxOccurrences;
  const horizonEnd = options.until ?? addDays(seed, MAX_HORIZON_DAYS);

  const results: Date[] = [];

  const shouldStop = (d: Date) => {
    if (results.length >= maxOccurrences) return true;
    if (results.length >= targetCount) return true;
    if (endDate && d > endDate) return true;
    if (d > horizonEnd) return true;
    return false;
  };

  if (cfg.recurrence === "diaria") {
    let d = addDays(seed, interval);
    while (!shouldStop(d)) { results.push(new Date(d)); d = addDays(d, interval); }
  } else if (cfg.recurrence === "semanal") {
    const days = (cfg.recurrence_days && cfg.recurrence_days.length > 0)
      ? cfg.recurrence_days
      : [WEEKDAY_KEYS[seed.getDay()]];
    const dayNums = days.map((k) => WEEKDAY_KEYS.indexOf(k)).filter((n) => n >= 0).sort((a, b) => a - b);
    // Start from the day AFTER seed, walking week by week.
    const seedWeekStart = addDays(seed, -seed.getDay()); // sunday of seed week
    let weekIdx = 0;
    let pushed = false;
    while (true) {
      const weekStart = addDays(seedWeekStart, weekIdx * 7 * interval);
      for (const dn of dayNums) {
        const occ = new Date(weekStart);
        occ.setDate(weekStart.getDate() + dn);
        occ.setHours(seed.getHours(), seed.getMinutes(), seed.getSeconds(), 0);
        if (occ <= seed) continue;
        if (shouldStop(occ)) { pushed = true; break; }
        results.push(occ);
      }
      if (pushed) break;
      if (results.length >= targetCount || results.length >= maxOccurrences) break;
      weekIdx++;
      if (weekIdx > 520) break; // 10y safety
    }
  } else if (cfg.recurrence === "mensal") {
    const mode = cfg.recurrence_monthly_mode ?? "day_of_month";
    if (mode === "weekday_of_month") {
      const weekday = seed.getDay();
      const seedDay = seed.getDate();
      const nth = Math.ceil(seedDay / 7);
      let monthIdx = interval;
      while (true) {
        const base = addMonths(seed, monthIdx);
        const occDay = nthWeekdayOfMonth(base.getFullYear(), base.getMonth(), weekday, nth);
        if (occDay) {
          const occ = new Date(occDay);
          occ.setHours(seed.getHours(), seed.getMinutes(), 0, 0);
          if (shouldStop(occ)) break;
          results.push(occ);
        }
        monthIdx += interval;
        if (monthIdx > 240) break;
      }
    } else {
      const day = seed.getDate();
      let monthIdx = interval;
      while (true) {
        const base = addMonths(seed, monthIdx);
        // clamp day to last of month if needed
        const last = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
        const occ = new Date(base.getFullYear(), base.getMonth(), Math.min(day, last),
          seed.getHours(), seed.getMinutes(), 0, 0);
        if (shouldStop(occ)) break;
        results.push(occ);
        monthIdx += interval;
        if (monthIdx > 240) break;
      }
    }
  }

  return results;
}
