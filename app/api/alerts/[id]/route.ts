import { NextResponse } from "next/server";
import { AlertInputError, deleteAlert, isAlertId } from "@/lib/alerts";
import { alertErrorResponse } from "@/lib/alerts-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!isAlertId(id)) {
      throw new AlertInputError();
    }
    await deleteAlert(id);
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return alertErrorResponse(error, "delete an alert");
  }
}
