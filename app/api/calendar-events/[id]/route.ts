import { NextRequest, NextResponse } from "next/server";
import {
  CalendarEventInputError,
  deleteCalendarEvent,
  isCalendarEventId,
  parseCalendarEvent,
  updateCalendarEvent,
} from "@/lib/calendar-events";
import { calendarEventErrorResponse } from "@/lib/calendar-events-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new CalendarEventInputError();
    }

    const { id } = await context.params;
    if (!isCalendarEventId(id)) {
      throw new CalendarEventInputError();
    }

    await updateCalendarEvent(id, parseCalendarEvent(body));
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return calendarEventErrorResponse(error, "update an event");
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!isCalendarEventId(id)) {
      throw new CalendarEventInputError();
    }

    await deleteCalendarEvent(id);
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return calendarEventErrorResponse(error, "delete an event");
  }
}
