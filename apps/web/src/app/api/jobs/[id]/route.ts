import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { getJob } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireApiAuth())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { id } = await params;
  const result = await getJob(id);
  if (!result) return NextResponse.json({ error: "Lote não encontrado." }, { status: 404 });
  return NextResponse.json(result);
}
