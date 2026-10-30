import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Consulta CPF | Painel",
  description: "Consultas em lote com histórico, cache inteligente e exportação.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
