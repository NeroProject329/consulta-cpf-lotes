import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { toCsv, toXlsx } from "@/lib/files";
import { getJob } from "@/lib/jobs";

export const runtime = "nodejs";
export const maxDuration = 60;

function safeName(value: string) {
  return value.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 80) || "consulta";
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireApiAuth())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { id } = await params;
  const result = await getJob(id);
  if (!result) return NextResponse.json({ error: "Lote não encontrado." }, { status: 404 });
  const format = new URL(request.url).searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const base = `${safeName(result.job.filename)}-resultado`;

  if (format === "xlsx") {
    const workbook = await toXlsx(result.items);
    return new NextResponse(workbook as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${base}.xlsx"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const csv = `\uFEFF${toCsv(result.items)}`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${base}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
