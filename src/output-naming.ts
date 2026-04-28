/**
 * Output naming derivation. Per v1.2 spec §5 and the governance "output-naming"
 * convention inherited from PTXprint upstream:
 *
 *   <PRJ>_<Config>_<bks>_ptxp.pdf
 *
 * where <bks> is a single book code if `books.length === 1`, or
 * "<first>-<last>" if multiple.
 *
 * R2 layout:
 *   outputs/<payload_hash>/<PRJ>_<Config>_<bks>_ptxp.pdf
 *   outputs/<payload_hash>/<PRJ>_<Config>_<bks>_ptxp.log
 */

import type { Payload } from "./payload.js";

export function bookRange(books: string[]): string {
  if (books.length === 0) return "ALL";
  if (books.length === 1) return books[0]!;
  return `${books[0]}-${books[books.length - 1]}`;
}

export function pdfBasename(payload: Payload): string {
  const bks = bookRange(payload.books);
  return `${payload.project_id}_${payload.config_name}_${bks}_ptxp.pdf`;
}

export function logBasename(payload: Payload): string {
  const bks = bookRange(payload.books);
  return `${payload.project_id}_${payload.config_name}_${bks}_ptxp.log`;
}

export function outputPdfKey(payload: Payload, payloadHash: string): string {
  return `outputs/${payloadHash}/${pdfBasename(payload)}`;
}

export function outputLogKey(payload: Payload, payloadHash: string): string {
  return `outputs/${payloadHash}/${logBasename(payload)}`;
}
