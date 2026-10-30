import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { cancelJob } from "@/lib/jobs";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireApiAuth())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { id } = await params;
  const job = await cancelJob(id);
  if (!job) return NextResponse.json({ error: "Lote não encontrado." }, { status: 404 });
  return NextResponse.json({ job, hasMore: false });
}
