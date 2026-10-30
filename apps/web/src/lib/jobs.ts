import { consultCpf } from "@/lib/api-client";
import { ensureSchema, sql } from "@/lib/db";
import type { JobItem, JobSummary, QueryMode } from "@/lib/types";
import type postgres from "postgres";

const price = Number(process.env.PAID_QUERY_PRICE ?? 0.1);

export async function createJob(input: {
  filename: string;
  mode: QueryMode;
  requestedLimit: number | null;
  cpfs: string[];
}) {
  await ensureSchema();
  const estimatedCount = input.mode === "paid" ? Math.min(input.cpfs.length, input.requestedLimit ?? input.cpfs.length) : 0;

  return sql.begin(async (tx) => {
    const [job] = await tx<JobSummary[]>`
      insert into consultation_jobs (filename, mode, requested_limit, total_items, estimated_cost)
      values (${input.filename}, ${input.mode}, ${input.requestedLimit}, ${input.cpfs.length}, ${estimatedCount * price})
      returning *
    `;
    const values = input.cpfs.map((cpf, rowIndex) => ({ job_id: job.id, row_index: rowIndex, cpf }));
    await tx`insert into consultation_job_items ${tx(values, "job_id", "row_index", "cpf")}`;
    return job;
  });
}

export async function getJob(id: string) {
  await ensureSchema();
  const [job] = await sql<JobSummary[]>`select * from consultation_jobs where id = ${id}`;
  if (!job) return null;
  const items = await sql<JobItem[]>`
    select id, row_index, cpf, status, result, error_message, cost::text, source_mode
    from consultation_job_items where job_id = ${id} order by row_index asc
  `;
  return { job, items };
}

export async function listJobs(limit = 20) {
  await ensureSchema();
  return sql<JobSummary[]>`
    select *, estimated_cost::text, amount_spent::text, balance_after::text
    from consultation_jobs order by created_at desc limit ${limit}
  `;
}

export async function getDashboardData() {
  await ensureSchema();
  const [stats, jobs, balanceSetting] = await Promise.all([
    sql<
      Array<{ total_jobs: number; total_cpfs: number; cached_cpfs: number; total_spent: string }>
    >`
      select count(*)::int as total_jobs,
             coalesce(sum(total_items), 0)::int as total_cpfs,
             coalesce(sum(cached_items), 0)::int as cached_cpfs,
             coalesce(sum(amount_spent), 0)::text as total_spent
      from consultation_jobs
    `,
    listJobs(8),
    sql<Array<{ value: { balance?: number } }>>`select value from app_settings where key = 'provider_balance'`,
  ]);
  return { stats: stats[0], jobs, balance: balanceSetting[0]?.value?.balance ?? null };
}

function jsonValue(value: unknown): postgres.JSONValue {
  return JSON.parse(JSON.stringify(value)) as postgres.JSONValue;
}

async function findCached(tx: postgres.TransactionSql, cpf: string, mode: QueryMode) {
  const allowedModes = mode === "free" ? ["paid", "free"] : ["paid"];
  const rows = await tx<Array<{ result: JobItem["result"]; mode: QueryMode }>>`
    select result, mode from consultation_cache
    where cpf = ${cpf} and mode in ${tx(allowedModes)}
    order by case when mode = 'paid' then 0 else 1 end, updated_at desc limit 1
  `;
  return rows[0] ?? null;
}

async function recalculateJob(id: string) {
  const [aggregate] = await sql<
    Array<{
      total: number;
      processed: number;
      success: number;
      failed: number;
      cached: number;
      live: number;
      spent: string;
    }>
  >`
    select count(*)::int as total,
      count(*) filter (where status not in ('pending','processing'))::int as processed,
      count(*) filter (where status in ('success','cached'))::int as success,
      count(*) filter (where status = 'error')::int as failed,
      count(*) filter (where status = 'cached')::int as cached,
      count(*) filter (where status = 'success')::int as live,
      coalesce(sum(cost), 0)::text as spent
    from consultation_job_items where job_id = ${id}
  `;
  const status =
    aggregate.processed < aggregate.total
      ? "processing"
      : aggregate.failed > 0
        ? "completed_with_errors"
        : "completed";
  const [job] = await sql<JobSummary[]>`
    update consultation_jobs set status = ${status}, processed_items = ${aggregate.processed},
      success_items = ${aggregate.success}, failed_items = ${aggregate.failed},
      cached_items = ${aggregate.cached}, live_items = ${aggregate.live},
      amount_spent = ${aggregate.spent}, updated_at = now()
    where id = ${id} returning *, estimated_cost::text, amount_spent::text, balance_after::text
  `;
  return job;
}

async function markItemError(itemId: number, message: string) {
  await sql`
    update consultation_job_items set status = 'error', error_message = ${message.slice(0, 1000)}, updated_at = now()
    where id = ${itemId}
  `;
}

export async function processJobChunk(id: string, chunkSize = 5) {
  await ensureSchema();
  const [job] = await sql<JobSummary[]>`select * from consultation_jobs where id = ${id}`;
  if (!job) return null;
  if (["completed", "completed_with_errors", "failed"].includes(job.status)) return getJob(id);

  await sql`update consultation_jobs set status = 'processing', updated_at = now() where id = ${id}`;
  const pending = await sql<Array<{ id: number; cpf: string; row_index: number }>>`
    select id, cpf, row_index from consultation_job_items
    where job_id = ${id} and status = 'pending' order by row_index asc limit ${chunkSize}
  `;

  for (const item of pending) {
    try {
      await sql.begin(async (tx) => {
        await tx`select pg_advisory_xact_lock(hashtext(${item.cpf}))`;
        const cached = await findCached(tx, item.cpf, job.mode);
        if (cached) {
          await tx`
            update consultation_job_items set status = 'cached', result = ${tx.json(jsonValue(cached.result))},
              source_mode = ${cached.mode}, cost = 0, updated_at = now() where id = ${item.id}
          `;
          return;
        }

        if (job.mode === "paid" && job.requested_limit != null) {
          const [usage] = await tx<Array<{ count: number }>>`
            select count(*)::int as count from consultation_job_items where job_id = ${id} and status = 'success'
          `;
          if (usage.count >= job.requested_limit) {
            await tx`
              update consultation_job_items set status = 'skipped',
                error_message = 'Fora da quantidade paga selecionada.', updated_at = now() where id = ${item.id}
            `;
            return;
          }
        }

        const result = await consultCpf(item.cpf, job.mode);
        await tx`
          insert into consultation_cache (cpf, mode, response, result, transaction_id, cost, consulted_at, updated_at)
          values (${item.cpf}, ${job.mode}, ${tx.json(jsonValue(result.response))}, ${tx.json(jsonValue(result.normalized))},
            ${result.transactionId}, ${result.cost}, now(), now())
          on conflict (cpf, mode) do update set response = excluded.response, result = excluded.result,
            transaction_id = excluded.transaction_id, cost = excluded.cost, consulted_at = now(), updated_at = now()
        `;
        await tx`
          update consultation_job_items set status = 'success', result = ${tx.json(jsonValue(result.normalized))},
            source_mode = ${job.mode}, cost = ${result.cost}, updated_at = now() where id = ${item.id}
        `;
        if (result.balance != null) {
          await tx`
            insert into app_settings (key, value, updated_at) values ('provider_balance', ${tx.json({ balance: result.balance })}, now())
            on conflict (key) do update set value = excluded.value, updated_at = now()
          `;
          await tx`update consultation_jobs set balance_after = ${result.balance} where id = ${id}`;
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha desconhecida na consulta.";
      await markItemError(item.id, message);
    }
  }

  const updated = await recalculateJob(id);
  const remaining = updated.processed_items < updated.total_items;
  return { ...(await getJob(id)), hasMore: remaining };
}
