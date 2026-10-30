"use client";

import { Download, Play, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { JobSummary } from "@/lib/types";

export function JobRunner({ initialJob }: { initialJob: JobSummary }) {
  const router = useRouter();
  const runningRef = useRef(false);
  const [job, setJob] = useState(initialJob);
  const [running, setRunning] = useState(initialJob.status === "processing");
  const [error, setError] = useState("");
  const terminal = ["completed", "completed_with_errors", "failed"].includes(job.status);
  const progress = job.total_items ? Math.round((job.processed_items / job.total_items) * 100) : 0;

  const run = useCallback(async () => {
    if (runningRef.current || terminal) return;
    runningRef.current = true;
    setRunning(true);
    setError("");
    try {
      let hasMore = true;
      while (hasMore) {
        const response = await fetch(`/api/jobs/${job.id}/process`, { method: "POST" });
        const data = (await response.json()) as { job?: JobSummary; hasMore?: boolean; error?: string };
        if (!response.ok || !data.job) throw new Error(data.error || "Falha no processamento.");
        setJob(data.job);
        hasMore = Boolean(data.hasMore);
        router.refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "A consulta foi interrompida.");
    } finally {
      runningRef.current = false;
      setRunning(false);
      router.refresh();
    }
  }, [job.id, router, terminal]);

  useEffect(() => {
    if (initialJob.status === "processing" && !terminal) void run();
  }, [initialJob.status, run, terminal]);

  return (
    <section className="card">
      <div className="card-body">
        <div className="section-head"><div><strong>{progress}% concluído</strong><p className="card-copy">{job.processed_items} de {job.total_items} itens processados</p></div><span>{running ? "Processando…" : terminal ? "Processamento finalizado" : "Pronto para iniciar"}</span></div>
        <div className="progress" aria-label={`${progress}% concluído`}><span style={{ width: `${progress}%` }} /></div>
        {error ? <div className="alert alert-error">{error}</div> : null}
        <div className="submit-row job-actions">
          {!terminal ? <button className="button button-primary" type="button" onClick={run} disabled={running}>{running ? <RefreshCw size={15} /> : <Play size={15} />}{running ? "Consultando" : job.processed_items ? "Continuar" : "Iniciar consulta"}</button> : null}
          {job.processed_items > 0 ? <><a className="button button-secondary" href={`/api/jobs/${job.id}/export?format=csv`}><Download size={15} />CSV</a><a className="button button-secondary" href={`/api/jobs/${job.id}/export?format=xlsx`}><Download size={15} />Excel</a></> : null}
        </div>
      </div>
    </section>
  );
}
