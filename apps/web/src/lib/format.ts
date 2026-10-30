export function currency(value: number | string | null | undefined) {
  if (value == null || value === "") return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
}

export function dateTime(value: string | Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Aguardando",
    processing: "Processando",
    completed: "Concluído",
    completed_with_errors: "Concluído com alertas",
    failed: "Falhou",
    cached: "Banco",
    success: "Consultado",
    error: "Erro",
    skipped: "Não consultado",
  };
  return labels[status] ?? status;
}
