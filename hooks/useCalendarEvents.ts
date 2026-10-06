"use client";

import { useApiCollection } from "@/hooks/useApiCollection";
import type { CalendarEvent } from "@/types/calendar";

function isCalendarEvent(value: unknown): value is CalendarEvent {
  if (typeof value !== "object" || value === null) return false;
  const event = value as Record<string, unknown>;
  return (
    typeof event.id === "string" &&
    typeof event.startAt === "string" &&
    Number.isFinite(Date.parse(event.startAt)) &&
    typeof event.title === "string" &&
    typeof event.description === "string" &&
    typeof event.category === "string"
  );
}

const errorMessages = {
  "database-not-configured": "Cosmos DB är inte konfigurerat för kalendern.",
  "not-found": "Händelsen finns inte längre i kalendern.",
  conflict:
    "Händelsen ändrades samtidigt av någon annan. Hämta kalendern och försök igen.",
  "invalid-request":
    "Kontrollera att alla fält är ifyllda och att tiden ligger framåt.",
};

export function useCalendarEvents() {
  return useApiCollection<CalendarEvent>({
    endpoint: "/api/calendar-events",
    responseKey: "events",
    isItem: isCalendarEvent,
    invalidResponseMessage: "Cosmos DB returnerade ett oväntat kalendersvar.",
    fallbackErrorMessage:
      "Kunde inte spara eller hämta kalendern från Cosmos DB.",
    errorMessages,
    refreshIntervalMs: 60 * 1000,
  });
}
