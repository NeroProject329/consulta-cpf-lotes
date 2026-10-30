import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { requirePageAuth } from "@/lib/auth";
import { currency, dateTime } from "@/lib/format";
import { listJobs } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  await requirePageAuth();
  const jobs = await listJobs(100);
  return (
    <AppShell active="history">
      <div className="content">
        <div className="page-head"><div><p className="eyebrow">Arquivo operacional</p><h1>Histórico de consultas</h1><p className="lead">Acesse resultados anteriores e exporte novamente sem fazer uma nova consulta.</p></div><Link href="/" className="button button-primary">Nova consulta</Link></div>
        <div className="card table-wrap">
          {jobs.length ? <table className="table"><thead><tr><th>Arquivo</th><th>Tipo</th><th>Itens</th><th>Do banco</th><th>Consumido</th><th>Saldo após</th><th>Status</th><th>Criado em</th></tr></thead><tbody>
            {jobs.map((job) => <tr key={job.id}><td><Link href={`/consultas/${job.id}`}><strong>{job.filename}</strong></Link></td><td>{job.mode === "paid" ? "Completa" : "Gratuita"}</td><td>{job.processed_items}/{job.total_items}</td><td>{job.cached_items}</td><td>{currency(job.amount_spent)}</td><td>{currency(job.balance_after)}</td><td><StatusBadge status={job.status} /></td><td>{dateTime(job.created_at)}</td></tr>)}
          </tbody></table> : <div className="empty">Ainda não há consultas no histórico.</div>}
        </div>
      </div>
    </AppShell>
  );
}
