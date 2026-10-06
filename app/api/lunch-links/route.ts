import { NextRequest, NextResponse } from "next/server";
import {
  createLunchLink,
  getLunchLinks,
  LunchLinkInputError,
  parseLunchLink,
} from "@/lib/lunch-links";
import { lunchLinkErrorResponse } from "@/lib/lunch-links-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const links = await getLunchLinks();
    return NextResponse.json(
      { links },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return lunchLinkErrorResponse(error, "load");
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new LunchLinkInputError();
    }

    const link = parseLunchLink(body);
    await createLunchLink(link);
    return NextResponse.json(
      { created: true },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return lunchLinkErrorResponse(error, "create a link");
  }
}
