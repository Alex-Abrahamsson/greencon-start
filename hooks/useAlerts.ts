"use client";

import { useApiCollection } from "@/hooks/useApiCollection";
import type { AlertMessage } from "@/types/alert";

function isAlert(value: unknown): value is AlertMessage {
  if (typeof value !== "object" || value === null) return false;
  const alert = value as Record<string, unknown>;
  return (
    typeof alert.id === "string" &&
    typeof alert.prefix === "string" &&
    typeof alert.text === "string" &&
    (alert.type === "alert" ||
      alert.type === "warning" ||
      alert.type === "info" ||
      alert.type === "success")
  );
}

const errorMessages = {
  "database-not-configured": "Cosmos DB är inte konfigurerat för alerts.",
  "not-found": "Alerten finns inte längre.",
  "invalid-request": "Ange en typ och ett meddelande på högst 500 tecken.",
};

export function useAlerts() {
  return useApiCollection<AlertMessage>({
    endpoint: "/api/alerts",
    responseKey: "alerts",
    isItem: isAlert,
    invalidResponseMessage: "Cosmos DB returnerade ett oväntat alert-svar.",
    fallbackErrorMessage: "Kunde inte spara eller hämta alerts från Cosmos DB.",
    errorMessages,
  });
}
