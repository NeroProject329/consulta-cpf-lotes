const CPF_PATTERN = /(?<!\d)(\d{3}[.\s-]?\d{3}[.\s-]?\d{3}[\s-]?\d{2})(?!\d)/g;

export function onlyDigits(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function isValidCpf(value: unknown): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const calculateDigit = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(cpf[index]) * (length + 1 - index);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculateDigit(9) === Number(cpf[9]) && calculateDigit(10) === Number(cpf[10]);
}

export function formatCpf(value: string): string {
  const cpf = onlyDigits(value).padStart(11, "0").slice(-11);
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function maskCpf(value: string): string {
  const formatted = formatCpf(value);
  return `***.${formatted.slice(4, 7)}.${formatted.slice(8, 11)}-**`;
}

export function extractCpfsFromText(text: string): string[] {
  const matches = text.matchAll(CPF_PATTERN);
  return Array.from(matches, (match) => onlyDigits(match[1])).filter(isValidCpf);
}

export function findCpfInValues(values: unknown[]): string | null {
  for (const value of values) {
    const direct = onlyDigits(value);
    if (isValidCpf(direct)) return direct;
    const [found] = extractCpfsFromText(String(value ?? ""));
    if (found) return found;
  }
  return null;
}
