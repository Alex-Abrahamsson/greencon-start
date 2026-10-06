import { NextRequest, NextResponse } from "next/server";
import {
  createNoticeBoardSuggestion,
  getNoticeBoard,
  isVoterId,
  NoticeBoardInputError,
  parseNewSuggestion,
} from "@/lib/notice-board";
import { noticeBoardErrorResponse } from "@/lib/notice-board-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const voterId = request.nextUrl.searchParams.get("voterId");
  if (!isVoterId(voterId)) {
    return NextResponse.json(
      { error: "invalid-request" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const suggestions = await getNoticeBoard(voterId);
    return NextResponse.json(
      { suggestions },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return noticeBoardErrorResponse(error, "load");
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new NoticeBoardInputError();
    }
    const suggestion = parseNewSuggestion(body);
    await createNoticeBoardSuggestion(suggestion);
    return NextResponse.json(
      { created: true },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return noticeBoardErrorResponse(error, "create an item");
  }
}
