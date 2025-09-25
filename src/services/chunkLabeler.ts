// src/services/chunkLabeler.ts
import crypto from "crypto";

export type ChunkLabel = {
  title: string;
  tags: string[];
  confidence: number; // 0..1
};

export type LabelerOptions = {
  // Max characters we'll send to the LLM (cheap safeguard)
  maxChars?: number;
  // Existing titles in this product/document to enforce uniqueness
  existingTitles?: string[];
  // Optional topic/context to improve disambiguation
  contextHint?: string;
  // Model caller
  callModel: (prompt: string) => Promise<string>; // returns raw JSON string
};

const DEFAULT_MAX_CHARS = 2000;

// Very small, stable prompt
function buildPrompt(chunk: string, contextHint?: string) {
  const rules = `You generate short, unique titles and tags for marketing-content chunks.

Rules:
- Title: 4–8 words, specific, non-generic, never "Untitled".
- Tags: 2–4 items; single words or very short phrases; no duplicates.
- Use the chunk's core feature/benefit/pain to disambiguate.
- Output strict JSON matching this schema:
  {"title":"...", "tags":["...","..."], "confidence":0.0}`;

  const ctx = contextHint?.trim()
    ? `Context hint: ${contextHint}\n`
    : "";

  return `${rules}

${ctx}Chunk:
<<<
${chunk}
>>>`;
}

function truncate(s: string, max = DEFAULT_MAX_CHARS) {
  if (s.length <= max) return s;
  return s.slice(0, max);
}

function hashString(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

// Simple near-dup check (cheap + good enough)
function isNearDuplicate(a: string, b: string) {
  const na = a.toLowerCase();
  const nb = b.toLowerCase();
  if (na === nb) return true;
  // Weak heuristic: if one contains the other and length difference < 4
  if (na.includes(nb) || nb.includes(na)) {
    return Math.abs(na.length - nb.length) < 4;
  }
  return false;
}

function enforceUniqueness(
  title: string,
  existing: string[] = [],
  hint?: string
) {
  const clash = existing.some((t) => isNearDuplicate(t, title));
  if (!clash) return title;
  // Add a discriminating suffix from hint or a salient word
  const suffix = hint?.split(/\s+/).slice(0, 2).join(" ") || "Variant";
  const candidate = `${title} — ${suffix}`;
  // If that still clashes, add a short hash
  if (existing.some((t) => isNearDuplicate(t, candidate))) {
    return `${title} — ${hashString(title).slice(0, 6)}`;
  }
  return candidate;
}

// In-memory cache; swap for Redis/db if needed
const memoryCache = new Map<string, ChunkLabel>();

export async function titleAndTagChunk(
  rawChunk: string,
  opts: LabelerOptions
): Promise<ChunkLabel> {
  const maxChars = opts.maxChars ?? DEFAULT_MAX_CHARS;
  const chunk = truncate(rawChunk.trim(), maxChars);

  // Cache by chunk+context
  const cacheKey = hashString(chunk + "::" + (opts.contextHint ?? ""));
  const cached = memoryCache.get(cacheKey);
  if (cached) return cached;

  const prompt = buildPrompt(chunk, opts.contextHint);
  let jsonStr = await opts.callModel(prompt);

  // Minimal paranoia for bad outputs
  const safe = jsonStr.trim().replace(/```json|```/g, "");
  let parsed: ChunkLabel;
  try {
    parsed = JSON.parse(safe);
  } catch {
    // Tiny fallback prompt (one retry): prepend "Output valid JSON only."
    jsonStr = await opts.callModel(
      "Output valid JSON only, no commentary.\n" + prompt
    );
    const safe2 = jsonStr.trim().replace(/```json|```/g, "");
    parsed = JSON.parse(safe2);
  }

  // Guard rails
  let title = (parsed.title || "").trim();
  if (
    !title ||
    /^untitled$/i.test(title) ||
    /^overview$/i.test(title) ||
    title.length < 3
  ) {
    // derive a cheap fallback: pick strongest keyword from chunk
    const m = chunk.match(/\b([A-Z][A-Za-z0-9\-]{2,})\b/);
    title = m ? m[1] : "Key Benefit";
  }

  title = enforceUniqueness(title, opts.existingTitles, opts.contextHint);

  const uniqTags = Array.from(
    new Set((parsed.tags || []).map((t) => t.trim()).filter(Boolean))
  ).slice(0, 4);

  const out: ChunkLabel = {
    title,
    tags: uniqTags.length ? uniqTags : ["benefit"],
    confidence:
      typeof parsed.confidence === "number"
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.6,
  };

  memoryCache.set(cacheKey, out);
  return out;
}
