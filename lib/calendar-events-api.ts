import { NextResponse } from "next/server";
import { CosmosConfigurationError } from "@/lib/cosmos-db";
import {
  CalendarEventConflictError,
  CalendarEventInputError,
  CalendarEventNotFoundError,
} from "@/lib/calendar-events";

export function calendarEventErrorResponse(error: unknown, operation: string) {
  if (error instanceof CalendarEventInputError) {
    return NextResponse.json(
      { error: "invalid-request" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (error instanceof CalendarEventNotFoundError) {
    return NextResponse.json(
      { error: "not-found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (error instanceof CalendarEventConflictError) {
    return NextResponse.json(
      { error: "conflict" },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (error instanceof CosmosConfigurationError) {
    return NextResponse.json(
      { error: "database-not-configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  console.error(`Unable to ${operation} in the calendar.`, error);
  return NextResponse.json(
    { error: "database-unavailable" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
