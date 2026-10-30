import { Database, LockKeyhole } from "lucide-react";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAuthenticated()) redirect("/");
  const { error } = await searchParams;

  return (
    <main className="login-page">
      <section className="login-art">
        <div className="brand"><span className="brand-mark"><Database size={18} /></span>Consulta CPF</div>
        <div>
          <p className="eyebrow">Consulta organizada. Crédito preservado.</p>
          <h1>Dados em lote, sem pagar <em>duas vezes.</em></h1>
          <p>Importe sua lista, consulte apenas o que ainda não está salvo e leve o resultado completo em CSV ou Excel.</p>
        </div>
        <p>Ambiente restrito • Sessão segura • Histórico persistente</p>
      </section>
      <section className="login-panel">
        <form className="login-box" action="/api/auth/login" method="post">
          <p className="eyebrow">Acesso administrativo</p>
          <h2>Bem-vindo de volta</h2>
          <p>Use a senha configurada para entrar no painel.</p>
          <label className="field-label" htmlFor="password">Senha</label>
          <input className="input" id="password" name="password" type="password" required autoFocus autoComplete="current-password" />
          {error ? <div className="alert alert-error">Senha inválida ou ambiente sem configuração.</div> : null}
          <button className="button button-primary" type="submit"><LockKeyhole size={15} />Entrar com segurança</button>
        </form>
      </section>
    </main>
  );
}
