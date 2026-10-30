import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth } from "@/lib/auth";
import { parseCpfFile } from "@/lib/files";
import { createJob, listJobs } from "@/lib/jobs";

export const runtime = "nodejs";
export const maxDuration = 30;

const inputSchema = z.object({
  mode: z.enum(["free", "paid"]),
  limit: z.coerce.number().int().positive().max(10_000).nullable(),
});

export async function GET() {
  if (!(await requireApiAuth())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  return NextResponse.json({ jobs: await listJobs(50) });
}

export async function POST(request: Request) {
  if (!(await requireApiAuth())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("Selecione um arquivo.");
    const mode = String(form.get("mode") ?? "free");
    const limitValue = form.get("limit");
    const parsed = inputSchema.parse({ mode, limit: mode === "paid" && limitValue ? limitValue : null });
    const cpfs = await parseCpfFile(file);
    const job = await createJob({ filename: file.name, mode: parsed.mode, requestedLimit: parsed.limit, cpfs });
    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível criar a consulta.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
