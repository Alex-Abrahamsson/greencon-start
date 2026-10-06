import { NextRequest, NextResponse } from "next/server";
import {
  isSuggestionId,
  isVoterId,
  setNoticeBoardLike,
  deleteNoticeBoardSuggestion,
  NoticeBoardInputError,
} from "@/lib/notice-board";
import { noticeBoardErrorResponse } from "@/lib/notice-board-api";

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
      throw new NoticeBoardInputError();
    }
    if (typeof body !== "object" || body === null) {
      throw new NoticeBoardInputError();
    }

    const { id } = await context.params;
    const input = body as Record<string, unknown>;
    if (
      !isSuggestionId(id) ||
      !isVoterId(input.voterId) ||
      typeof input.isLiked !== "boolean"
    ) {
      throw new NoticeBoardInputError();
    }

    const suggestion = await setNoticeBoardLike(
      id,
      input.voterId,
      input.isLiked,
    );
    return NextResponse.json(
      { suggestion },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return noticeBoardErrorResponse(error, "update a like");
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!isSuggestionId(id)) {
      throw new NoticeBoardInputError();
    }
    await deleteNoticeBoardSuggestion(id);
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return noticeBoardErrorResponse(error, "delete an item");
  }
}
