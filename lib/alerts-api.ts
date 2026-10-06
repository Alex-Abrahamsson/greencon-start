import { NextResponse } from "next/server";
import { CosmosConfigurationError } from "@/lib/cosmos-db";
import { AlertInputError, AlertNotFoundError } from "@/lib/alerts";

export function alertErrorResponse(error: unknown, operation: string) {
  if (error instanceof AlertInputError) {
    return NextResponse.json(
      { error: "invalid-request" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (error instanceof AlertNotFoundError) {
    return NextResponse.json(
      { error: "not-found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (error instanceof CosmosConfigurationError) {
    return NextResponse.json(
      { error: "database-not-configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  console.error(`Unable to ${operation} for alerts.`, error);
  return NextResponse.json(
    { error: "database-unavailable" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
