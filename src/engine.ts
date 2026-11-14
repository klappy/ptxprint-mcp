import lock from "../engine-lock.json";

export const ENGINE_LOCK = lock;
// Shared with Python's sort_keys=True compact JSON; lock contains ASCII only.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k,v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value) as string;
}
async function sha256(value: string): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), b => b.toString(16).padStart(2,"0")).join("");
}
export async function engineFingerprint(engine: unknown = ENGINE_LOCK): Promise<string> {
  return sha256(canonical(engine));
}
export async function renderHash(payloadHash: string, fingerprint: string): Promise<string> {
  return sha256(`ptxprint-render-v1:${fingerprint}:${payloadHash}`);
}
