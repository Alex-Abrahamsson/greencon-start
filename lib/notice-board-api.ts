import { NextResponse } from "next/server";
import { CosmosConfigurationError } from "@/lib/cosmos-db";
import {
  NoticeBoardInputError,
  NoticeBoardNotFoundError,
} from "@/lib/notice-board";

export function noticeBoardErrorResponse(error: unknown, operation: string) {
  if (error instanceof NoticeBoardInputError) {
    return NextResponse.json(
      { error: "invalid-request" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (error instanceof NoticeBoardNotFoundError) {
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

  console.error(`Unable to ${operation} on the notice board.`, error);
  return NextResponse.json(
    { error: "database-unavailable" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
