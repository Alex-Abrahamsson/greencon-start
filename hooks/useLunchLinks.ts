"use client";

import { useApiCollection } from "@/hooks/useApiCollection";
import type { LunchLink } from "@/types/lunchLink";

function isLunchLink(value: unknown): value is LunchLink {
  if (typeof value !== "object" || value === null) return false;
  const link = value as Record<string, unknown>;
  return (
    typeof link.id === "string" &&
    typeof link.name === "string" &&
    typeof link.href === "string"
  );
}

const errorMessages = {
  "database-not-configured":
    "Cosmos DB är inte konfigurerat för lunchlänkarna.",
  "not-found": "Lunchlänken finns inte längre.",
  "invalid-request": "Ange ett namn och en giltig HTTPS-adress.",
};

export function useLunchLinks() {
  return useApiCollection<LunchLink>({
    endpoint: "/api/lunch-links",
    responseKey: "links",
    isItem: isLunchLink,
    invalidResponseMessage:
      "Cosmos DB returnerade ett oväntat svar för lunchlänkar.",
    fallbackErrorMessage:
      "Kunde inte spara eller hämta lunchlänkar från Cosmos DB.",
    errorMessages,
  });
}
