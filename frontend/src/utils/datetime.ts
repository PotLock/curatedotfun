// import { parseISO, format } from "date-fns";

// export const formatDate = (dateInput: string | Date) => {
//   try {
//     // Handle both string and Date inputs
//     const date =
//       typeof dateInput === "string" ? parseISO(dateInput) : dateInput;
//     // Format the date using date-fns
//     return format(date, "MMM d, yyyy h:mm a");
//   } catch (error) {
//     console.error("Error formatting date:", error);
//     return String(dateInput);
//   }
// };

import {
  parseISO,
  format,
  differenceInSeconds,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  differenceInYears,
} from "date-fns";

export const formatDate = (dateInput: string | Date) => {
  try {
    // Handle both string and Date inputs
    const date =
      typeof dateInput === "string" ? parseISO(dateInput) : dateInput;
    const now = new Date();

    // Calculate differences
    const secondsDiff = differenceInSeconds(now, date);
    const minutesDiff = differenceInMinutes(now, date);
    const hoursDiff = differenceInHours(now, date);
    const daysDiff = differenceInDays(now, date);
    const weeksDiff = differenceInWeeks(now, date);
    const monthsDiff = differenceInMonths(now, date);
    const yearsDiff = differenceInYears(now, date);

    // Format as relative time for recent dates
    if (secondsDiff < 60) {
      return secondsDiff <= 5 ? "just now" : `${secondsDiff}s ago`;
    } else if (minutesDiff < 60) {
      return `${minutesDiff}m ago`;
    } else if (hoursDiff < 24) {
      return `${hoursDiff}h ago`;
    } else if (daysDiff < 7) {
      return `${daysDiff}d ago`;
    } else if (weeksDiff < 4) {
      return `${weeksDiff}w ago`;
    } else if (monthsDiff < 12) {
      return `${monthsDiff}m ago`;
    } else {
      return `${yearsDiff}y ago`;
    }

    // Fallback to absolute date format (uncomment if you want a cutoff)
    // return format(date, "MMM d, yyyy h:mm a");
  } catch (error) {
    console.error("Error formatting date:", error);
    return String(dateInput);
  }
};
