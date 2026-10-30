import { Banknote, DatabaseZap, Files, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { UploadConsultation } from "@/components/upload-consultation";
import { requirePageAuth } from "@/lib/auth";
import { currency, dateTime } from "@/lib/format";
import { getDashboardData } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requirePageAuth();
  const { stats, jobs, balance } = await getDashboardData();

  return (
    <AppShell>
      <div className="content">
        <div className="page-head">
          <div>
            <p className="eyebrow">Visão geral</p>
            <h1>Consultas sem desperdício.</h1>
            <p className="lead">Importe uma lista, escolha o nível de dados e deixe o banco reaproveitar tudo o que já foi consultado.</p>
          </div>
        </div>

        <section className="metrics" aria-label="Indicadores">
          <Metric icon={<Files size={15} />} label="Lotes" value={stats.total_jobs.toLocaleString("pt-BR")} caption="consultas criadas" />
          <Metric icon={<DatabaseZap size={15} />} label="CPFs processados" value={stats.total_cpfs.toLocaleString("pt-BR")} caption="incluindo repetições entre listas" />
          <Metric icon={<ShieldCheck size={15} />} label="Economia por cache" value={stats.cached_cpfs.toLocaleString("pt-BR")} caption="sem nova cobrança" />
          <Metric icon={<Banknote size={15} />} label="Total consumido" value={currency(stats.total_spent)} caption="registrado pela API" />
        </section>

        <div className="grid-main">
          <UploadConsultation />
          <aside>
            <section className="card balance-card">
              <div className="balance-hero">
                <span className="balance-label">Saldo da API</span>
                <strong className="balance-value">{currency(balance)}</strong>
                <div className="balance-meta">Atualizado após a última consulta à API</div>
              </div>
              <div className="balance-list">
                <div className="balance-row"><span>Consulta gratuita</span><strong>R$ 0,00</strong></div>
                <div className="balance-row"><span>Consulta completa</span><strong>R$ 0,10</strong></div>
                <div className="balance-row"><span>Resultado no banco</span><strong>R$ 0,00</strong></div>
              </div>
            </section>
            <div className="privacy-box">
              <strong><ShieldCheck size={16} /> Reuso inteligente</strong>
              <p>Antes de chamar a API, o sistema procura o CPF no banco. Se houver dados compatíveis, o resultado entra no lote sem consumir crédito.</p>
            </div>
          </aside>
        </div>

        <section className="section">
          <div className="section-head"><h2>Consultas recentes</h2><Link className="section-link" href="/historico">Ver histórico completo →</Link></div>
          <div className="card table-wrap">
            {jobs.length ? (
              <table className="table">
                <thead><tr><th>Arquivo</th><th>Modalidade</th><th>Progresso</th><th>Economia</th><th>Status</th><th>Data</th></tr></thead>
                <tbody>{jobs.map((job) => (
                  <tr key={job.id}>
                    <td><Link href={`/consultas/${job.id}`}><strong>{job.filename}</strong></Link></td>
                    <td>{job.mode === "paid" ? "Completa" : "Gratuita"}</td>
                    <td>{job.processed_items}/{job.total_items}</td>
                    <td>{job.cached_items} do banco</td>
                    <td><StatusBadge status={job.status} /></td>
                    <td>{dateTime(job.created_at)}</td>
                  </tr>
                ))}</tbody>
              </table>
            ) : <div className="empty">Sua primeira consulta aparecerá aqui.</div>}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Metric({ icon, label, value, caption }: { icon: React.ReactNode; label: string; value: string; caption: string }) {
  return <div className="metric"><div className="metric-top"><span>{label}</span><span className="metric-icon">{icon}</span></div><strong className="metric-value">{value}</strong><span className="metric-caption">{caption}</span></div>;
}
