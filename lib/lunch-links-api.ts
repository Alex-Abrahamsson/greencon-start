import { NextResponse } from "next/server";
import { CosmosConfigurationError } from "@/lib/cosmos-db";
import {
  LunchLinkConflictError,
  LunchLinkInputError,
  LunchLinkNotFoundError,
} from "@/lib/lunch-links";

export function lunchLinkErrorResponse(error: unknown, operation: string) {
  if (error instanceof LunchLinkInputError) {
    return NextResponse.json(
      { error: "invalid-request" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (error instanceof LunchLinkNotFoundError) {
    return NextResponse.json(
      { error: "not-found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (error instanceof LunchLinkConflictError) {
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

  console.error(`Unable to ${operation} for lunch links.`, error);
  return NextResponse.json(
    { error: "database-unavailable" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
