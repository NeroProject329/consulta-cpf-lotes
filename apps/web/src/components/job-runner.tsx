"use client";

import { Download, Play, RefreshCw, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { JobSummary } from "@/lib/types";

const BATCH_DELAY_MS = 2_000;

async function readJsonResponse(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text) as { job?: JobSummary; hasMore?: boolean; error?: string };
  } catch {
    throw new Error(
      response.status === 413
        ? "O servidor recusou o tamanho da requisição. Divida o arquivo em uma lista menor."
        : `O servidor respondeu em formato inválido (${response.status}).`,
    );
  }
}

export function JobRunner({ initialJob }: { initialJob: JobSummary }) {
  const router = useRouter();
  const runningRef = useRef(false);
  const [job, setJob] = useState(initialJob);
  const [running, setRunning] = useState(initialJob.status === "processing");
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const terminal = ["cancelled", "completed", "completed_with_errors", "failed"].includes(job.status);
  const progress = job.total_items ? Math.round((job.processed_items / job.total_items) * 100) : 0;

  const run = useCallback(async () => {
    if (runningRef.current || terminal) return;
    runningRef.current = true;
    setRunning(true);
    setError("");
    try {
      let hasMore = true;
      let completedBatches = 0;
      while (hasMore) {
        const response = await fetch(`/api/jobs/${job.id}/process`, { method: "POST" });
        const data = await readJsonResponse(response);
        if (!response.ok || !data.job) throw new Error(data.error || "Falha no processamento.");
        setJob(data.job);
        hasMore = Boolean(data.hasMore);
        completedBatches += 1;
        if (!hasMore || completedBatches % 10 === 0) router.refresh();
        if (hasMore) await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "A consulta foi interrompida.");
    } finally {
      runningRef.current = false;
      setRunning(false);
      router.refresh();
    }
  }, [job.id, router, terminal]);

  const cancel = useCallback(async () => {
    if (terminal || cancelling || !window.confirm("Cancelar este lote? Os resultados já processados serão mantidos.")) return;
    setCancelling(true);
    setError("");
    try {
      const response = await fetch(`/api/jobs/${job.id}/cancel`, { method: "POST" });
      const data = await readJsonResponse(response);
      if (!response.ok || !data.job) throw new Error(data.error || "Não foi possível cancelar o lote.");
      setJob(data.job);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível cancelar o lote.");
    } finally {
      setCancelling(false);
    }
  }, [cancelling, job.id, router, terminal]);

  useEffect(() => {
    if (initialJob.status === "processing" && !terminal) void run();
  }, [initialJob.status, run, terminal]);

  return (
    <section className="card">
      <div className="card-body">
        <div className="section-head"><div><strong>{progress}% concluído</strong><p className="card-copy">{job.processed_items} de {job.total_items} itens processados</p></div><span>{cancelling ? "Cancelando…" : job.status === "cancelled" ? "Lote cancelado" : running ? "Processando…" : terminal ? "Processamento finalizado" : "Pronto para iniciar"}</span></div>
        <div className="progress" aria-label={`${progress}% concluído`}><span style={{ width: `${progress}%` }} /></div>
        <p className="card-copy">Processamento seguro em lotes de 5, com chamadas sequenciais e pausa automática entre os lotes.</p>
        {error ? <div className="alert alert-error">{error}</div> : null}
        <div className="submit-row job-actions">
          {!terminal ? <button className="button button-primary" type="button" onClick={run} disabled={running}>{running ? <RefreshCw size={15} /> : <Play size={15} />}{running ? "Consultando" : job.processed_items ? "Continuar" : "Iniciar consulta"}</button> : null}
          {!terminal ? <button className="button button-danger" type="button" onClick={cancel} disabled={cancelling}><Square size={14} />{cancelling ? "Cancelando" : "Cancelar lote"}</button> : null}
          {job.processed_items > 0 ? <><a className="button button-secondary" href={`/api/jobs/${job.id}/export?format=csv`}><Download size={15} />CSV</a><a className="button button-secondary" href={`/api/jobs/${job.id}/export?format=xlsx`}><Download size={15} />Excel</a></> : null}
        </div>
      </div>
    </section>
  );
}
