import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "consulta_session";
const SESSION_DURATION = 12 * 60 * 60;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET não configurado.");
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION;
  const payload = `admin.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token?: string): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [user, expiresRaw, signature] = parts;
  if (user !== "admin" || Number(expiresRaw) < Math.floor(Date.now() / 1000)) return false;
  const expected = sign(`${user}.${expiresRaw}`);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function isAuthenticated() {
  const store = await cookies();
  return verifySessionToken(store.get(COOKIE_NAME)?.value);
}

export async function requirePageAuth() {
  if (!(await isAuthenticated())) redirect("/login");
}

export async function requireApiAuth() {
  return isAuthenticated();
}

export const sessionCookie = {
  name: COOKIE_NAME,
  maxAge: SESSION_DURATION,
};

export function passwordMatches(candidate: string) {
  const configured = process.env.APP_PASSWORD;
  if (!configured) return false;
  const candidateBuffer = Buffer.from(candidate);
  const configuredBuffer = Buffer.from(configured);
  return candidateBuffer.length === configuredBuffer.length && timingSafeEqual(candidateBuffer, configuredBuffer);
}
