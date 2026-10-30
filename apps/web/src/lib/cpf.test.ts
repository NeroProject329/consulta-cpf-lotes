import { describe, expect, it } from "vitest";
import { extractCpfsFromText, formatCpf, isValidCpf } from "./cpf";

describe("CPF utilities", () => {
  it("validates a CPF checksum", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("111.111.111-11")).toBe(false);
  });

  it("extracts formatted and unformatted CPFs", () => {
    expect(extractCpfsFromText("529.982.247-25; 16899535009")).toEqual(["52998224725", "16899535009"]);
  });

  it("formats eleven digits", () => {
    expect(formatCpf("52998224725")).toBe("529.982.247-25");
  });
});
