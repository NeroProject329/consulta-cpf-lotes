import { Database, History, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";

export function AppShell({ children, active = "dashboard" }: { children: React.ReactNode; active?: "dashboard" | "history" }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="brand-mark"><Database size={18} /></span>
          Consulta CPF
        </Link>
        <nav className="nav" aria-label="Navegação principal">
          <Link className={active === "dashboard" ? "active" : ""} href="/"><LayoutDashboard size={17} />Painel</Link>
          <Link className={active === "history" ? "active" : ""} href="/historico"><History size={17} />Histórico</Link>
        </nav>
        <div className="sidebar-foot">
          <p className="security-note"><ShieldCheck size={13} /> Dados protegidos e token da API mantido somente no servidor.</p>
          <form action="/api/auth/logout" method="post">
            <button className="logout" type="submit"><LogOut size={16} />Sair</button>
          </form>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <span className="topbar-title">Operação de consultas</span>
          <span className="topbar-user">AD</span>
        </header>
        {children}
      </main>
    </div>
  );
}
