import { NextRequest, NextResponse } from "next/server";
import {
  deleteLunchLink,
  isLunchLinkId,
  LunchLinkInputError,
  parseLunchLink,
  updateLunchLink,
} from "@/lib/lunch-links";
import { lunchLinkErrorResponse } from "@/lib/lunch-links-api";

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
      throw new LunchLinkInputError();
    }

    const { id } = await context.params;
    if (!isLunchLinkId(id)) {
      throw new LunchLinkInputError();
    }

    const input = parseLunchLink(body);
    await updateLunchLink(id, input);
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return lunchLinkErrorResponse(error, "update a link");
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!isLunchLinkId(id)) {
      throw new LunchLinkInputError();
    }
    await deleteLunchLink(id);
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return lunchLinkErrorResponse(error, "delete a link");
  }
}
