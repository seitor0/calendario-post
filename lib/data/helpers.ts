export const AXIS_COLORS = ["#6366F1", "#0EA5E9", "#10B981", "#F59E0B", "#D946EF", "#06B6D4"];
export const PAID_CHANNEL_DEFAULTS = [
  "Google search / Meta Ads",
  "Google Ads",
  "LinkedIn Ads",
  "TikTok Ads",
  "Programmatic"
];

export function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  (Object.keys(obj) as (keyof T)[]).forEach((key) => {
    const value = obj[key];
    if (value !== undefined) {
      out[key] = value;
    }
  });
  return out;
}

// chat helpers removed (chat disabled)
