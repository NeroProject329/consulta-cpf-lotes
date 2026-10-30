import type { NormalizedPerson, QueryMode } from "@/lib/types";

interface ProviderResponse {
  success?: boolean;
  message?: string;
  data?: {
    novo_saldo?: number;
    total_paid?: number;
    transaction_id?: number;
    doc_formatted?: string;
    modules?: Record<string, { status?: string; message?: string | null; data?: Record<string, unknown> }>;
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown) {
  return value == null ? "" : String(value);
}

function getArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function retryDelay(response: Response, attempt: number) {
  const retryAfter = Number(response.headers.get("retry-after"));
  return Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1_500 * 2 ** attempt;
}

export function normalizeProviderResponse(response: ProviderResponse, cpf: string): NormalizedPerson {
  const modules = response.data?.modules ?? {};
  const full = asRecord(modules.dados_completo?.data);
  const basic = asRecord(modules.dados_basico?.data);
  const source = Object.keys(full).length > 0 ? full : basic;
  const pessoa = asRecord(source.pessoa);

  const emailsRaw = getArray(source.emails ?? source.EMAILS ?? source.dadosEmails);
  const phonesRaw = getArray(source.telefones ?? source.TELEFONES ?? source.dadosTelefone);
  const addressesRaw = getArray(source.enderecos ?? source.ENDERECOS ?? source.dadosEndereco);
  const relativesRaw = getArray(source.parentes ?? source.PARENTES);

  return {
    cpf: stringValue(source.cpf ?? pessoa.cpf ?? response.data?.doc_formatted ?? cpf),
    nome: stringValue(source.NOME ?? pessoa.nome),
    dataNascimento: stringValue(source.NASC ?? pessoa.data_nascimento),
    sexo: stringValue(source.SEXO ?? pessoa.sexo),
    nomeMae: stringValue(source.NOME_MAE ?? pessoa.nome_mae),
    nomePai: stringValue(source.NOME_PAI),
    renda: source.RENDA == null ? null : Number(source.RENDA),
    situacao: stringValue(pessoa.situacao),
    emails: emailsRaw.map((item) => stringValue(item.email ?? item.EMAIL)).filter(Boolean),
    telefones: phonesRaw
      .map((item) => stringValue(item.completo ?? item.TELEFONE_FMT ?? `${item.ddd ?? item.DDD ?? ""}${item.numero ?? item.TELEFONE ?? ""}`))
      .filter(Boolean),
    enderecos: addressesRaw
      .map((item) =>
        stringValue(
          item.ENDERECO_FORMATADO ??
            [item.tipo_logradouro, item.logradouro, item.numero, item.bairro, item.cidade, item.estado, item.cep]
              .filter(Boolean)
              .join(" - "),
        ),
      )
      .filter(Boolean),
    parentes: relativesRaw
      .map((item) => [item.VINCULO ?? item.vinculo, item.NOME_VINCULO ?? item.nome].filter(Boolean).join(": "))
      .filter(Boolean),
    consultedAt: stringValue(source.consultadoEm ?? new Date().toISOString()),
    raw: response,
  };
}

export async function consultCpf(cpf: string, mode: QueryMode) {
  const url = process.env.CPF_API_URL;
  const token = process.env.CPF_API_TOKEN;
  if (!url || !token) throw new Error("API de CPF não configurada.");

  const moduleKeys = mode === "paid" ? ["dados_completo", "dados_basico"] : ["dados_basico"];
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    let request: Response;
    try {
      request = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Api-Key": token },
        body: JSON.stringify({ doc_type: "cpf", module_keys: moduleKeys, inputs: { CPF: cpf } }),
        signal: controller.signal,
        cache: "no-store",
      });
    } finally {
      clearTimeout(timeout);
    }

    if ([429, 502, 503, 504].includes(request.status) && attempt < maxAttempts - 1) {
      await wait(retryDelay(request, attempt));
      continue;
    }

    const body = await request.text();
    let response: ProviderResponse;
    try {
      response = JSON.parse(body) as ProviderResponse;
    } catch {
      throw new Error(`A API de CPF respondeu em formato inválido (${request.status}).`);
    }
    if (!request.ok || !response.success || !response.data) {
      throw new Error(response.message || `Falha na consulta (${request.status}).`);
    }

    const failedModule = moduleKeys.find((key) => {
      const status = response.data?.modules?.[key]?.status;
      return status && !["ok", "limpo"].includes(status);
    });
    if (failedModule) {
      throw new Error(response.data.modules?.[failedModule]?.message || `Módulo ${failedModule} retornou erro.`);
    }

    return {
      response,
      normalized: normalizeProviderResponse(response, cpf),
      balance: response.data.novo_saldo ?? null,
      cost: response.data.total_paid ?? (mode === "paid" ? Number(process.env.PAID_QUERY_PRICE ?? 0.1) : 0),
      transactionId: response.data.transaction_id ?? null,
    };
  }

  throw new Error("A API de CPF permaneceu indisponível após novas tentativas.");
}
