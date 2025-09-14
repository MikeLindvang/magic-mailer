/**
 * Markdown normalization utilities for safe passthrough processing
 * 
 * Handles common markdown input issues:
 * - BOM (Byte Order Mark) removal
 * - Line break normalization
 * - Whitespace trimming
 */

/**
 * Normalizes raw markdown/text input for safe processing
 * 
 * @param input - Raw markdown or text string
 * @returns Normalized markdown with consistent formatting
 */
export function normalizeMd(input: string): { markdown: string } {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  let normalized = input;

  // Remove BOM (Byte Order Mark) if present
  // BOM can appear at the start of UTF-8 files and cause parsing issues
  if (normalized.charCodeAt(0) === 0xFEFF) {
    normalized = normalized.slice(1);
  }

  // Normalize line breaks to Unix-style (\n)
  // Handles Windows (\r\n) and old Mac (\r) line endings
  normalized = normalized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Trim leading and trailing whitespace
  normalized = normalized.trim();

  return {
    markdown: normalized
  };
}
