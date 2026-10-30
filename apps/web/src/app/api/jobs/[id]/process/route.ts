import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { processJobChunk } from "@/lib/jobs";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireApiAuth())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { id } = await params;
  const result = await processJobChunk(id, 5);
  if (!result) return NextResponse.json({ error: "Lote não encontrado." }, { status: 404 });
  return NextResponse.json(result);
}
