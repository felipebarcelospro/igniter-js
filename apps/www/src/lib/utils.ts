import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
/**
 * Formats a date string into a more readable format.
 * @param dateStr - The date string to format.
 * @returns {string} The formatted date string.
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Truncates a string to a specified length and adds an ellipsis if it exceeds that length.
 * @param str - The string to truncate.
 * @param maxLength - The maximum length of the string.
 * @returns {string} The truncated string with an ellipsis if it exceeds the maximum length.
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength) + "...";
}
