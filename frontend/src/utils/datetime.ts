import { parseISO, format } from "date-fns";

export const formatDate = (dateInput: string | Date) => {
  try {
    // Handle both string and Date inputs
    const date =
      typeof dateInput === "string" ? parseISO(dateInput) : dateInput;
    // Format the date using date-fns
    return format(date, "MMM d, yyyy h:mm a");
  } catch (error) {
    console.error("Error formatting date:", error);
    return String(dateInput);
  }
};
