import { UI_TEXT } from "../../constants";

const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

export const formatRelative = (unixSeconds: number, now: number): string => {
  const deltaSec = Math.max(0, now - unixSeconds);
  const minutes = Math.floor(deltaSec / SECONDS_PER_MINUTE);
  if (minutes < 1) {
    return UI_TEXT.justNow;
  }
  if (minutes < MINUTES_PER_HOUR) {
    return `${minutes.toString()}m ago`;
  }
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_PER_DAY) {
    return `${hours.toString()}h ago`;
  }
  const days = Math.floor(hours / HOURS_PER_DAY);
  return `${days.toString()}d ago`;
};
