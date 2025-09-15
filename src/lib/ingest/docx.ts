/**
 * DOCX to Markdown conversion utility
 * Uses mammoth library for DOCX parsing when available
 */

// Type definitions for mammoth library
interface MammothResult {
  value: string;
  messages: Array<{ type: string; message: string }>;
}

interface MammothOptions {
  buffer: Buffer;
}

interface Mammoth {
  convertToHtml(options: MammothOptions): Promise<MammothResult>;
}

interface DocxConversionResult {
  markdown: string;
}

/**
 * Converts a DOCX buffer to markdown format
 * @param buf - Buffer containing DOCX file data
 * @returns Object containing the converted markdown string
 */
export async function docxToMarkdown(buf: Buffer): Promise<DocxConversionResult> {
  try {
    // Import mammoth with proper error handling
    const mammothModule = await import('mammoth');
    const mammoth = mammothModule.default as Mammoth;
    
    // Convert DOCX to HTML first
    const result = await mammoth.convertToHtml({ buffer: buf });
    
    // Basic HTML to Markdown conversion
    let markdown = result.value;
    
    // Convert common HTML elements to Markdown
    markdown = markdown
      // Headers
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
      .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
      .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
      
      // Paragraphs
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      
      // Bold and italic
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      
      // Lists
      .replace(/<ul[^>]*>/gi, '')
      .replace(/<\/ul>/gi, '\n')
      .replace(/<ol[^>]*>/gi, '')
      .replace(/<\/ol>/gi, '\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      
      // Line breaks
      .replace(/<br[^>]*>/gi, '\n')
      
      // Remove remaining HTML tags
      .replace(/<[^>]*>/g, '')
      
      // Clean up extra whitespace
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/^\s+|\s+$/g, '')
      .trim();
    
    return { markdown };
    
  } catch (error) {
    console.error('[DOCX] Processing error:', error);
    
    // If mammoth is not available or conversion fails
    if (error instanceof Error && (error.message.includes('Cannot resolve module') || error.message.includes('MODULE_NOT_FOUND'))) {
      return {
        markdown: `TODO: DOCX conversion requires mammoth library. Install with: pnpm add mammoth

To convert this DOCX file:
1. Install mammoth: \`pnpm add mammoth\`
2. The file will be automatically converted to markdown format
3. Content will include headers, paragraphs, lists, and basic formatting

File size: ${buf.length} bytes
File type: DOCX (Microsoft Word Document)`
      };
    }
    
    // Other conversion errors
    return {
      markdown: `TODO: Failed to convert DOCX file to markdown.

Error: ${error instanceof Error ? error.message : 'Unknown error'}

File size: ${buf.length} bytes
File type: DOCX (Microsoft Word Document)

To resolve:
1. Ensure the file is a valid DOCX document
2. Install mammoth library: \`pnpm add mammoth\`
3. Try the conversion again`
    };
  }
}

/**
 * Type guard to check if a buffer contains DOCX data
 * @param buf - Buffer to check
 * @returns True if buffer appears to contain DOCX data
 */
export function isDocxBuffer(buf: Buffer): boolean {
  // DOCX files are ZIP archives, check for ZIP signature
  const zipSignature = Buffer.from([0x50, 0x4B, 0x03, 0x04]); // "PK" + version
  const zipSignatureAlt = Buffer.from([0x50, 0x4B, 0x05, 0x06]); // Empty ZIP
  
  if (buf.length < 4) return false;
  
  const header = buf.subarray(0, 4);
  return header.equals(zipSignature) || header.equals(zipSignatureAlt);
}

/**
 * Validates DOCX buffer and provides helpful error messages
 * @param buf - Buffer to validate
 * @returns Validation result with success status and message
 */
export function validateDocxBuffer(buf: Buffer): { valid: boolean; message: string } {
  if (!buf || buf.length === 0) {
    return { valid: false, message: 'Buffer is empty or null' };
  }
  
  if (buf.length < 100) {
    return { valid: false, message: 'File too small to be a valid DOCX document' };
  }
  
  if (!isDocxBuffer(buf)) {
    return { valid: false, message: 'File does not appear to be a valid DOCX document (missing ZIP signature)' };
  }
  
  return { valid: true, message: 'Buffer appears to contain valid DOCX data' };
}

/**
 * Extracts text from DOCX buffer and converts to markdown
 * @param buf - Buffer containing DOCX file data
 * @returns Object containing the converted markdown string and optional title
 */
export async function extractTextFromDocx(buf: Buffer): Promise<{ markdown: string; title?: string }> {
  const result = await docxToMarkdown(buf);
  
  // Try to extract title from the first heading in the markdown
  const titleMatch = result.markdown.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : undefined;
  
  return {
    markdown: result.markdown,
    title,
  };
}