// Backend API services for the image scan and LLM title extraction flow.

import {
  sortStringsAlpha,
  sortCandidatesAlpha,
} from "../../utils/yourLibrary/sortHelpers";

import { BACKEND_BASE } from "../../constants/apiConfig";

/**
 * Sends a single image file to the backend OCR endpoint.
 * Returns the raw extracted text string.
 */
export async function scanImageForText(file) {
  const fd = new FormData();
  fd.append("image", file);

  const res = await fetch(`${BACKEND_BASE}/api/scan-image`, {
    method: "POST",
    body: fd,
    credentials: "include",
  });

  const contentType = res.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await res.json().catch(() => ({}))
    : { message: await res.text().catch(() => "") };

  if (!res.ok) {
    const msg =
      payload?.error ||
      payload?.message ||
      `Scan failed (HTTP ${res.status}).`;
    throw new Error(msg);
  }

  const raw =
    payload?.rawText ||
    payload?.text ||
    payload?.result ||
    payload?.ocrText ||
    "";

  return String(raw || "").trim();
}

/**
 * Sends raw text to the backend LLM endpoint to extract a clean list of
 * game titles. Returns { sortedTitles, nextCandidates } ready for the
 * import UI.
 */
export async function extractGameTitlesWithLLM(text) {
  const cleanedText = String(text || "").trim();
  if (!cleanedText) return { sortedTitles: [], nextCandidates: [] };

  const res = await fetch(`${BACKEND_BASE}/api/extract-game-candidates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ text: cleanedText }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || data?.message || "LLM extract failed");
  }

  const titles = Array.isArray(data?.titles) ? data.titles : [];

  const seen = new Set();
  const uniq = [];
  for (const t of titles) {
    const s = String(t || "").trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(s);
  }

  const sortedTitles = sortStringsAlpha(uniq);

  const now = Date.now();
  const nextCandidatesRaw = sortedTitles.map((t, idx) => ({
    id: `${now}_${idx}`,
    raw: t,
    cleaned: t,
  }));
  const nextCandidates = sortCandidatesAlpha(nextCandidatesRaw);

  return { sortedTitles, nextCandidates };
}
