import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JobRunner } from "@/components/job-runner";
import { StatusBadge } from "@/components/status-badge";
import { requirePageAuth } from "@/lib/auth";
import { maskCpf } from "@/lib/cpf";
import { currency, dateTime } from "@/lib/format";
import { getJob } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageAuth();
  const { id } = await params;
  const result = await getJob(id);
  if (!result) notFound();
  const { job, items } = result;

  return (
    <AppShell>
      <div className="content">
        <div className="page-head"><div><p className="eyebrow">Lote {job.id.slice(0, 8)}</p><h1>{job.filename}</h1><p className="lead">Consulta {job.mode === "paid" ? "completa" : "gratuita"} criada em {dateTime(job.created_at)}.</p></div><StatusBadge status={job.status} /></div>
        <div className="detail-grid">
          <SmallMetric label="Itens" value={String(job.total_items)} />
          <SmallMetric label="Consultados" value={String(job.live_items)} />
          <SmallMetric label="Do banco" value={String(job.cached_items)} />
          <SmallMetric label="Erros" value={String(job.failed_items)} />
          <SmallMetric label="Consumido" value={currency(job.amount_spent)} />
        </div>
        <JobRunner initialJob={job} />
        <section className="section">
          <div className="section-head"><h2>Itens da lista</h2><span className="section-link">CPFs mascarados nesta visão</span></div>
          <div className="card table-wrap">
            <table className="table"><thead><tr><th>#</th><th>CPF</th><th>Nome</th><th>Nascimento</th><th>Telefones</th><th>E-mails</th><th>Origem</th><th>Status</th></tr></thead><tbody>
              {items.map((item) => <tr key={item.id}><td>{item.row_index + 1}</td><td>{maskCpf(item.cpf)}</td><td><span className="person-name">{item.result?.nome || "—"}</span>{item.error_message ? <div className="person-sub">{item.error_message}</div> : null}</td><td>{item.result?.dataNascimento || "—"}</td><td>{item.result?.telefones?.length ?? 0}</td><td>{item.result?.emails?.length ?? 0}</td><td>{item.status === "cached" ? "Banco" : item.status === "success" ? "API" : "—"}</td><td><StatusBadge status={item.status} /></td></tr>)}
            </tbody></table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><span className="metric-top">{label}</span><strong className="metric-value">{value}</strong></div>;
}
