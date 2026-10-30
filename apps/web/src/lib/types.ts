export type QueryMode = "free" | "paid";

export type JobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "completed_with_errors"
  | "failed";

export interface NormalizedPerson {
  cpf: string;
  nome: string;
  dataNascimento: string;
  sexo: string;
  nomeMae: string;
  nomePai: string;
  renda: number | null;
  situacao: string;
  telefones: string[];
  emails: string[];
  enderecos: string[];
  parentes: string[];
  consultedAt: string;
  raw: unknown;
}

export interface JobSummary {
  id: string;
  filename: string;
  mode: QueryMode;
  requested_limit: number | null;
  status: JobStatus;
  total_items: number;
  processed_items: number;
  success_items: number;
  failed_items: number;
  cached_items: number;
  live_items: number;
  estimated_cost: string;
  amount_spent: string;
  balance_after: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobItem {
  id: number;
  row_index: number;
  cpf: string;
  status: "pending" | "processing" | "cached" | "success" | "error" | "skipped";
  result: NormalizedPerson | null;
  error_message: string | null;
  cost: string;
  source_mode: QueryMode | null;
}
