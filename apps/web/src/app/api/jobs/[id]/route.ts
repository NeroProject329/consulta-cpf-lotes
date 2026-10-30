import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { getJob } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireApiAuth())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { id } = await params;
  const url = new URL(request.url);
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") ?? 200)));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0));
  const result = await getJob(id, limit, offset);
  if (!result) return NextResponse.json({ error: "Lote não encontrado." }, { status: 404 });
  return NextResponse.json(result);
}
