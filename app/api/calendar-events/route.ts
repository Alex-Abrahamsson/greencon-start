import { NextRequest, NextResponse } from "next/server";
import {
  CalendarEventInputError,
  createCalendarEvent,
  getUpcomingCalendarEvents,
  parseCalendarEvent,
} from "@/lib/calendar-events";
import { calendarEventErrorResponse } from "@/lib/calendar-events-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const events = await getUpcomingCalendarEvents();
    return NextResponse.json(
      { events },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return calendarEventErrorResponse(error, "load events");
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new CalendarEventInputError();
    }

    const event = parseCalendarEvent(body);
    await createCalendarEvent(event);
    return NextResponse.json(
      { created: true },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return calendarEventErrorResponse(error, "create an event");
  }
}
