import { format, parseISO } from "date-fns";
import type { Billing, EventCard } from "./types";

export function formatDate(iso: string): string {
  return format(parseISO(iso), "EEE, MMM d");
}

export function formatDateLong(iso: string): string {
  return format(parseISO(iso), "EEEE, MMMM d, yyyy");
}

export function billingLabel(b: Billing): string {
  switch (b) {
    case "main-event":
      return "Main event";
    case "co-main":
      return "Co-main";
    case "main":
      return "Main card";
    case "prelim":
      return "Prelims";
    case "early":
      return "Early prelims";
  }
}

export function eventTitle(e: EventCard): string {
  return `${e.name}: ${e.subtitle}`;
}

export function inches(n: number): string {
  const ft = Math.floor(n / 12);
  const inch = n % 12;
  return `${ft}'${inch % 1 === 0 ? inch.toFixed(0) : inch}"`;
}
