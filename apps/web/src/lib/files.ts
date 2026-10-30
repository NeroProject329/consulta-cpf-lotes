import ExcelJS from "exceljs";
import Papa from "papaparse";
import { findCpfInValues } from "@/lib/cpf";
import type { JobItem, NormalizedPerson } from "@/lib/types";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_ROWS = 10_000;

export async function parseCpfFile(file: File): Promise<string[]> {
  if (file.size > MAX_FILE_SIZE) throw new Error("O arquivo excede o limite de 10 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());
  const rows: unknown[][] = [];

  if (extension === "csv" || file.type.includes("csv")) {
    const parsed = Papa.parse<unknown[]>(buffer.toString("utf8"), { skipEmptyLines: true });
    if (parsed.errors.length && !parsed.data.length) throw new Error("Não foi possível interpretar o CSV.");
    rows.push(...parsed.data);
  } else if (["xlsx", "xls"].includes(extension ?? "")) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new Error("A planilha não possui abas.");
    worksheet.eachRow((row) => {
      const values = row.values;
      rows.push(Array.isArray(values) ? values.slice(1) : Object.values(values ?? {}));
    });
  } else {
    throw new Error("Formato inválido. Envie um arquivo CSV, XLSX ou XLS.");
  }

  const cpfs: string[] = [];
  for (const row of rows.slice(0, MAX_ROWS + 1)) {
    const cpf = findCpfInValues(Array.isArray(row) ? row : [row]);
    if (cpf) cpfs.push(cpf);
  }
  if (rows.length > MAX_ROWS) throw new Error(`O arquivo pode conter no máximo ${MAX_ROWS.toLocaleString("pt-BR")} linhas.`);
  if (!cpfs.length) throw new Error("Nenhum CPF válido foi encontrado no arquivo.");
  return cpfs;
}

export function flattenResult(item: JobItem) {
  const result = item.result as NormalizedPerson | null;
  return {
    ordem: item.row_index + 1,
    cpf: result?.cpf || item.cpf,
    nome: result?.nome || "",
    data_nascimento: result?.dataNascimento || "",
    sexo: result?.sexo || "",
    nome_mae: result?.nomeMae || "",
    nome_pai: result?.nomePai || "",
    renda: result?.renda ?? "",
    situacao: result?.situacao || "",
    telefones: result?.telefones.join(" | ") || "",
    emails: result?.emails.join(" | ") || "",
    enderecos: result?.enderecos.join(" | ") || "",
    parentes: result?.parentes.join(" | ") || "",
    consultado_em: result?.consultedAt || "",
    status: item.status,
    origem: item.status === "cached" ? "banco" : item.status === "success" ? "api" : "",
    erro: item.error_message || "",
  };
}

export function toCsv(items: JobItem[]) {
  return Papa.unparse(items.map(flattenResult), { delimiter: ";", newline: "\r\n" });
}

export async function toXlsx(items: JobItem[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Consulta CPF";
  const worksheet = workbook.addWorksheet("Resultados", { views: [{ state: "frozen", ySplit: 1 }] });
  const rows = items.map(flattenResult);
  const keys = Object.keys(rows[0] ?? flattenResult({ row_index: 0, cpf: "", status: "pending" } as JobItem));
  worksheet.columns = keys.map((key) => ({ header: key.replaceAll("_", " ").toUpperCase(), key, width: 22 }));
  rows.forEach((row) => worksheet.addRow(row));
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF171C26" } };
  worksheet.autoFilter = { from: "A1", to: `${worksheet.getColumn(keys.length).letter}1` };
  return workbook.xlsx.writeBuffer();
}
