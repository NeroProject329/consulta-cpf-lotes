CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS consultation_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf char(11) NOT NULL,
  mode text NOT NULL CHECK (mode IN ('free', 'paid')),
  response jsonb NOT NULL,
  result jsonb NOT NULL,
  transaction_id bigint,
  cost numeric(12, 2) NOT NULL DEFAULT 0,
  consulted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cpf, mode)
);

CREATE INDEX IF NOT EXISTS consultation_cache_cpf_idx ON consultation_cache (cpf);

CREATE TABLE IF NOT EXISTS consultation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('free', 'paid')),
  requested_limit integer,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'completed_with_errors', 'failed')),
  total_items integer NOT NULL DEFAULT 0,
  processed_items integer NOT NULL DEFAULT 0,
  success_items integer NOT NULL DEFAULT 0,
  failed_items integer NOT NULL DEFAULT 0,
  cached_items integer NOT NULL DEFAULT 0,
  live_items integer NOT NULL DEFAULT 0,
  estimated_cost numeric(12, 2) NOT NULL DEFAULT 0,
  amount_spent numeric(12, 2) NOT NULL DEFAULT 0,
  balance_after numeric(12, 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consultation_job_items (
  id bigserial PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES consultation_jobs(id) ON DELETE CASCADE,
  row_index integer NOT NULL,
  cpf char(11) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'cached', 'success', 'error', 'skipped')),
  result jsonb,
  error_message text,
  cost numeric(12, 2) NOT NULL DEFAULT 0,
  source_mode text CHECK (source_mode IS NULL OR source_mode IN ('free', 'paid')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, row_index)
);

CREATE INDEX IF NOT EXISTS consultation_job_items_job_idx ON consultation_job_items (job_id, row_index);
CREATE INDEX IF NOT EXISTS consultation_job_items_pending_idx ON consultation_job_items (job_id, status);

CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
