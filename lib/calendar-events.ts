import "server-only";

import { randomUUID } from "node:crypto";
import { getCalendarEventsContainer } from "@/lib/cosmos-db";
import type { CalendarEvent } from "@/types/calendar";

const eventId = "greencon-start";
const eventKind = "calendar-event";

export class CalendarEventInputError extends Error {
  constructor() {
    super("The calendar event request is invalid.");
    this.name = "CalendarEventInputError";
  }
}

export class CalendarEventNotFoundError extends Error {
  constructor() {
    super("The requested calendar event was not found.");
    this.name = "CalendarEventNotFoundError";
  }
}

export class CalendarEventConflictError extends Error {
  constructor() {
    super("The calendar event was changed by another request.");
    this.name = "CalendarEventConflictError";
  }
}

type NewCalendarEvent = Pick<
  CalendarEvent,
  "title" | "description" | "category" | "startAt"
>;

type StoredCalendarEvent = CalendarEvent & {
  eventId: string;
  kind: typeof eventKind;
  _etag?: string;
};

export function isCalendarEventId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export function parseCalendarEvent(value: unknown): NewCalendarEvent {
  if (typeof value !== "object" || value === null) {
    throw new CalendarEventInputError();
  }

  const input = value as Record<string, unknown>;
  const { title, description, category, startAt } = input;
  const startsAt = typeof startAt === "string" ? Date.parse(startAt) : NaN;
  const isUtcTimestamp =
    typeof startAt === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(startAt);

  if (
    typeof title !== "string" ||
    title.trim().length === 0 ||
    title.trim().length > 120 ||
    typeof description !== "string" ||
    description.trim().length === 0 ||
    description.trim().length > 500 ||
    typeof category !== "string" ||
    category.trim().length === 0 ||
    category.trim().length > 32 ||
    !isUtcTimestamp ||
    !Number.isFinite(startsAt) ||
    startsAt <= Date.now()
  ) {
    throw new CalendarEventInputError();
  }

  return {
    title: title.trim(),
    description: description.trim(),
    category: category.trim(),
    startAt: new Date(startsAt).toISOString(),
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

async function readEvent(id: string) {
  try {
    const { resource } = await getCalendarEventsContainer()
      .item(id, eventId)
      .read<StoredCalendarEvent>();

    if (!resource || resource.kind !== eventKind) {
      throw new CalendarEventNotFoundError();
    }

    return resource;
  } catch (error) {
    if (error instanceof CalendarEventNotFoundError) throw error;
    if (getStatusCode(error) === 404) {
      throw new CalendarEventNotFoundError();
    }
    throw error;
  }
}

export async function getUpcomingCalendarEvents(): Promise<CalendarEvent[]> {
  const { resources } = await getCalendarEventsContainer().items
    .query<StoredCalendarEvent>(
      {
        query:
          "SELECT TOP 7 * FROM c WHERE c.eventId = @eventId AND c.kind = @kind AND c.startAt >= @now ORDER BY c.startAt ASC",
        parameters: [
          { name: "@eventId", value: eventId },
          { name: "@kind", value: eventKind },
          { name: "@now", value: new Date().toISOString() },
        ],
      },
      { partitionKey: eventId },
    )
    .fetchAll();

  return resources.map(({ id, startAt, title, description, category }) => ({
    id,
    startAt,
    title,
    description,
    category,
  }));
}

export async function createCalendarEvent(input: NewCalendarEvent) {
  const event: StoredCalendarEvent = {
    id: randomUUID(),
    eventId,
    kind: eventKind,
    ...input,
  };

  await getCalendarEventsContainer().items.create(event);
}

export async function updateCalendarEvent(
  id: string,
  input: NewCalendarEvent,
) {
  const event = await readEvent(id);
  if (!event._etag) {
    throw new Error("Cosmos DB did not return a calendar event ETag.");
  }

  try {
    await getCalendarEventsContainer()
      .item(id, eventId)
      .replace(
        {
          ...event,
          ...input,
        },
        {
          accessCondition: {
            type: "IfMatch",
            condition: event._etag,
          },
        },
      );
  } catch (error) {
    if (getStatusCode(error) === 412) {
      throw new CalendarEventConflictError();
    }
    throw error;
  }
}

export async function deleteCalendarEvent(id: string) {
  await readEvent(id);
  try {
    await getCalendarEventsContainer().item(id, eventId).delete();
  } catch (error) {
    if (getStatusCode(error) === 404) {
      throw new CalendarEventNotFoundError();
    }
    throw error;
  }
}
