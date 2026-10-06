import "server-only";

import { randomUUID } from "node:crypto";
import { getCalendarEventsContainer } from "@/lib/cosmos-db";
import type { AlertMessage, AlertType } from "@/types/alert";

const eventId = "greencon-start";
const alertKind = "alert";
const validTypes: AlertType[] = ["alert", "warning", "info", "success"];

export class AlertInputError extends Error {
  constructor() {
    super("The alert request is invalid.");
    this.name = "AlertInputError";
  }
}

export class AlertNotFoundError extends Error {
  constructor() {
    super("The requested alert was not found.");
    this.name = "AlertNotFoundError";
  }
}

type NewAlert = Pick<AlertMessage, "prefix" | "text" | "type">;

type StoredAlert = AlertMessage & {
  eventId: string;
  kind: typeof alertKind;
};

export function isAlertId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export function parseNewAlert(value: unknown): NewAlert {
  if (typeof value !== "object" || value === null) {
    throw new AlertInputError();
  }

  const input = value as Record<string, unknown>;
  const { prefix, text, type } = input;
  if (
    typeof prefix !== "string" ||
    prefix.trim().length === 0 ||
    prefix.trim().length > 32 ||
    typeof text !== "string" ||
    text.trim().length === 0 ||
    text.trim().length > 500 ||
    typeof type !== "string" ||
    !validTypes.includes(type as AlertType)
  ) {
    throw new AlertInputError();
  }

  return {
    prefix: prefix.trim(),
    text: text.trim(),
    type: type as AlertType,
  };
}

function getStatusCode(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }

  const { code } = error;
  if (typeof code === "number") return code;
  if (typeof code === "string" && /^\d+$/.test(code)) return Number(code);
  return undefined;
}

async function readAlert(id: string) {
  try {
    const { resource } = await getCalendarEventsContainer()
      .item(id, eventId)
      .read<StoredAlert>();

    if (!resource || resource.kind !== alertKind) {
      throw new AlertNotFoundError();
    }

    return resource;
  } catch (error) {
    if (error instanceof AlertNotFoundError) throw error;
    if (getStatusCode(error) === 404) {
      throw new AlertNotFoundError();
    }
    throw error;
  }
}

export async function getAlerts(): Promise<AlertMessage[]> {
  const { resources } = await getCalendarEventsContainer().items
    .query<StoredAlert>(
      {
        query:
          "SELECT * FROM c WHERE c.eventId = @eventId AND c.kind = @kind ORDER BY c._ts DESC",
        parameters: [
          { name: "@eventId", value: eventId },
          { name: "@kind", value: alertKind },
        ],
      },
      { partitionKey: eventId },
    )
    .fetchAll();

  return resources.map(({ id, prefix, text, type }) => ({
    id,
    prefix,
    text,
    type,
  }));
}

export async function createAlert(input: NewAlert) {
  const alert: StoredAlert = {
    id: randomUUID(),
    eventId,
    kind: alertKind,
    ...input,
  };

  await getCalendarEventsContainer().items.create(alert);
}

export async function deleteAlert(id: string) {
  await readAlert(id);
  try {
    await getCalendarEventsContainer().item(id, eventId).delete();
  } catch (error) {
    if (getStatusCode(error) === 404) {
      throw new AlertNotFoundError();
    }
    throw error;
  }
}
