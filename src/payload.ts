/**
 * Payload schema, JCS canonicalization, and sha256 hashing.
 *
 * Per v1.2 spec §4. The payload is the function-input to PTXprint as a pure function:
 *   PTXprint(config_files, sources, fonts, figures) -> PDF
 *
 * Hash computation follows RFC 8785 (JSON Canonicalization Scheme): sort keys
 * lexicographically, no whitespace, use the smallest valid JSON form for each
 * primitive. Two logically-equivalent payloads (different key order or whitespace)
 * canonicalize to identical strings and therefore produce identical hashes,
 * yielding identical R2 paths and free cache hits.
 */

import { z } from "zod";

// ---------- Schema ----------

const SourceSchema = z.object({
  book: z.string().min(2).max(3),
  filename: z.string().min(1),
  url: z.string().url(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});

const FontSchema = z.object({
  family_id: z.string().min(1),
  version: z.string().optional(),
  filename: z.string().min(1),
  url: z.string().url(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});

const FigureSchema = z.object({
  filename: z.string().min(1),
  url: z.string().url(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});

export const PayloadSchema = z.object({
  schema_version: z.literal("1.0"),
  project_id: z.string().min(1).max(8),
  config_name: z.string().min(1).max(64).default("Default"),
  books: z.array(z.string().min(2).max(3)).min(1),
  mode: z.enum(["simple", "autofill"]).default("simple"),
  define: z.record(z.string(), z.string()).default({}),
  config_files: z.record(z.string(), z.string()).default({}),
  sources: z.array(SourceSchema).default([]),
  fonts: z.array(FontSchema).default([]),
  figures: z.array(FigureSchema).default([]),
});

export type Payload = z.infer<typeof PayloadSchema>;

// ---------- JCS canonicalization (RFC 8785) ----------

/**
 * Canonicalize a JSON-serializable value per RFC 8785.
 *
 * Rules:
 *   - Object members serialized in lexicographic order of keys (UTF-16 code unit comparison).
 *   - No insignificant whitespace.
 *   - Strings escaped per JSON spec, unicode code points emitted directly when valid.
 *   - Numbers: only safe integers and finite floats; NaN/Infinity rejected.
 *
 * Day-1 implementation handles the subset our payload uses (objects, arrays, strings,
 * integers, booleans, null). Floating-point numbers are passed through; payload schema
 * prohibits them in practice, so this is fine for the smoke test.
 */
export function canonicalize(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("canonicalize: non-finite number");
    }
    if (Number.isInteger(value)) return value.toString();
    // Smallest round-tripping representation. JS toString is close enough for our schema
    // (no floats expected in payloads at v1.0).
    return value.toString();
  }
  if (typeof value === "string") return jsonStringEscape(value);
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort(); // UTF-16 code unit order is JS default
    const parts: string[] = [];
    for (const k of keys) {
      const v = obj[k];
      if (v === undefined) continue; // drop undefined; they're never serializable
      parts.push(jsonStringEscape(k) + ":" + canonicalize(v));
    }
    return "{" + parts.join(",") + "}";
  }
  throw new Error(`canonicalize: unsupported type ${typeof value}`);
}

function jsonStringEscape(s: string): string {
  // Use JSON.stringify for correct escaping of control chars, quotes, backslashes,
  // and non-BMP code points. JCS happens to match JSON.stringify for strings.
  return JSON.stringify(s);
}

// ---------- Hashing ----------

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function payloadHash(payload: Payload): Promise<string> {
  return sha256Hex(canonicalize(payload));
}
