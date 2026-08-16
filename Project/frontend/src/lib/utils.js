import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function unwrap(response) {
  const value = response?.data ?? response;
  return value?.data ?? value?.items ?? value?.results ?? value;
}

export function asArray(value) {
  const unwrapped = unwrap(value);
  if (Array.isArray(unwrapped)) return unwrapped;
  if (Array.isArray(unwrapped?.items)) return unwrapped.items;
  if (Array.isArray(unwrapped?.results)) return unwrapped.results;
  if (Array.isArray(unwrapped?.data)) return unwrapped.data;
  return [];
}

export function money(value) {
  if (value === undefined || value === null || value === "") return "Price pending";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value));
}

export function dateLabel(value) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}
