"use client";

import { FileSpreadsheet, LockKeyhole, Sparkles, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { QueryMode } from "@/lib/types";

const PRICE = 0.1;

export function UploadConsultation() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<QueryMode>("free");
  const [limit, setLimit] = useState(100);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function acceptFile(candidate?: File) {
    if (!candidate) return;
    const valid = /\.(csv|xlsx|xls)$/i.test(candidate.name);
    if (!valid) {
      setError("Envie um arquivo CSV ou Excel (.xlsx/.xls). ");
      return;
    }
    setError("");
    setFile(candidate);
  }

  async function submit() {
    if (!file) {
      setError("Selecione uma lista antes de continuar.");
      return;
    }
    setSubmitting(true);
    setError("");
    const body = new FormData();
    body.set("file", file);
    body.set("mode", mode);
    if (mode === "paid") body.set("limit", String(limit));

    try {
      const response = await fetch("/api/jobs", { method: "POST", body });
      const responseText = await response.text();
      let data: { job?: { id: string }; error?: string };
      try {
        data = JSON.parse(responseText) as { job?: { id: string }; error?: string };
      } catch {
        throw new Error(
          response.status === 413
            ? "O arquivo ultrapassou o limite da hospedagem atual. Use um arquivo menor ou publique o sistema no Railway."
            : `O servidor respondeu em formato inválido (${response.status}).`,
        );
      }
      if (!response.ok || !data.job) throw new Error(data.error || "Falha ao enviar o arquivo.");
      router.push(`/consultas/${data.job.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível enviar a lista.");
      setSubmitting(false);
    }
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2 className="card-title">Nova consulta em lote</h2>
        <p className="card-copy">Envie uma planilha com uma coluna de CPF. Cabeçalhos e outras colunas são aceitos.</p>
      </div>
      <div className="card-body">
        <div
          className={`dropzone ${dragging ? "dragging" : ""}`}
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); acceptFile(event.dataTransfer.files[0]); }}
        >
          <input ref={inputRef} hidden type="file" accept=".csv,.xlsx,.xls,text/csv" onChange={(event) => acceptFile(event.target.files?.[0])} />
          <div>
            <span className="drop-icon"><UploadCloud size={20} /></span>
            <strong>Arraste sua lista ou clique para selecionar</strong>
            <span>CSV, XLSX ou XLS • até 10 MB e 10.000 linhas</span>
          </div>
        </div>

        {file ? (
          <div className="file-pill"><FileSpreadsheet size={16} /><b>{file.name}</b><span>{(file.size / 1024).toFixed(1)} KB</span><button aria-label="Remover arquivo" onClick={() => setFile(null)}><X size={15} /></button></div>
        ) : null}

        <span className="field-label">Modalidade da consulta</span>
        <div className="mode-grid">
          <label className={`mode-option ${mode === "free" ? "selected" : ""}`}>
            <input type="radio" name="mode" checked={mode === "free"} onChange={() => setMode("free")} />
            <strong><Sparkles size={15} /> Gratuita</strong>
            <small>Dados básicos. Sem débito de saldo.</small>
          </label>
          <label className={`mode-option ${mode === "paid" ? "selected" : ""}`}>
            <input type="radio" name="mode" checked={mode === "paid"} onChange={() => setMode("paid")} />
            <strong><LockKeyhole size={15} /> Completa <span className="paid-tag">R$ 0,10/CPF</span></strong>
            <small>Telefones, e-mails, endereços e dados completos.</small>
          </label>
        </div>

        {mode === "paid" ? (
          <>
            <label className="field-label" htmlFor="limit">Quantidade máxima de CPFs novos</label>
            <input className="input" id="limit" type="number" min={1} max={10000} value={limit} onChange={(event) => setLimit(Math.max(1, Number(event.target.value) || 1))} />
            <div className="cost-box"><span>Custo máximo estimado</span><strong>{(limit * PRICE).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></div>
          </>
        ) : null}

        {error ? <div className="alert alert-error">{error}</div> : null}
        <div className="submit-row">
          <button className="button button-primary" type="button" disabled={submitting || !file} onClick={submit}>
            {submitting ? "Preparando lista…" : "Criar consulta"}
          </button>
        </div>
      </div>
    </section>
  );
}
