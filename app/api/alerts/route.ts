import { NextRequest, NextResponse } from "next/server";
import {
  AlertInputError,
  createAlert,
  getAlerts,
  parseNewAlert,
} from "@/lib/alerts";
import { alertErrorResponse } from "@/lib/alerts-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const alerts = await getAlerts();
    return NextResponse.json(
      { alerts },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return alertErrorResponse(error, "load");
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new AlertInputError();
    }

    const alert = parseNewAlert(body);
    await createAlert(alert);
    return NextResponse.json(
      { created: true },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return alertErrorResponse(error, "create an alert");
  }
}
