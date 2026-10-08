/** Client-safe nutrition log date helpers (no server/Firestore imports). */

const LOG_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseNutritionLogDate(value: string): string {
  const trimmed = value.trim();
  if (!LOG_DATE_PATTERN.test(trimmed)) {
    throw new Error("Invalid date.");
  }
  return trimmed;
}

export function defaultNutritionLogDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shiftNutritionLogDate(logDate: string, days: number): string {
  const [y, m, d] = logDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatNutritionInsightsLabel(
  logDate: string,
  today: string,
): string {
  if (logDate === today) return "Today";
  const yesterday = shiftNutritionLogDate(today, -1);
  if (logDate === yesterday) return "Yesterday";
  const [y, m, d] = logDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
