/**
 * PDF ingestion module for Magic Mailer
 * Converts PDF files to markdown format for processing
 */

/**
 * Converts a PDF buffer to markdown text
 * 
 * @param buf - PDF file buffer
 * @returns Object containing the extracted markdown content and metadata
 */
export async function pdfToMarkdown(buf: Buffer): Promise<{ markdown: string; title?: string; pages?: number }> {
  // Validate PDF buffer first
  if (!validatePdfBuffer(buf)) {
    throw new Error('Invalid PDF file: Buffer does not contain valid PDF data');
  }
  
  try {
    // Validate that we have a Buffer and not a string
    if (!Buffer.isBuffer(buf)) {
      throw new Error(`Expected Buffer but received ${typeof buf}`);
    }
    
    console.log('[PDF] Processing buffer of size:', buf.length, 'bytes');
    
    // Import pdf-parse with proper error handling
    // Note: We import from main module but the debug code should not run in production builds
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = pdfParseModule.default;
    
    if (typeof pdfParse !== 'function') {
      throw new Error('pdf-parse module did not export a function');
    }
    
    console.log('[PDF] Successfully loaded pdf-parse');
    
    // Additional debugging
    console.log('[PDF] About to call pdfParse with buffer type:', typeof buf, 'isBuffer:', Buffer.isBuffer(buf));
    
    // Parse the PDF buffer with minimal options
    const data = await pdfParse(buf);
    
    // Validate that we got some text content
    if (!data.text || typeof data.text !== 'string') {
      throw new Error('No readable text content found in PDF');
    }
    
    // Extract basic metadata
    const metadata = data.info || {};
    const title = metadata.Title || undefined;
    const pages = data.numpages || 0;
    
    // Convert extracted text to structured markdown
    const markdown = convertTextToMarkdown(data.text);
    
    // Final validation
    if (!markdown || markdown.trim().length === 0) {
      throw new Error('Failed to extract readable content from PDF');
    }
    
    return {
      markdown,
      title,
      pages,
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Invalid PDF')) {
        throw error; // Re-throw our own validation errors
      } else if (error.message.includes('password')) {
        throw new Error('PDF is password protected and cannot be processed');
      } else if (error.message.includes('encrypted')) {
        throw new Error('PDF is encrypted and cannot be processed');
      } else if (error.message.includes('corrupted')) {
        throw new Error('PDF file appears to be corrupted');
      }
    }
    
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper function to convert plain text to structured markdown
 * This analyzes the extracted text and adds appropriate markdown formatting
 * 
 * @param text - Plain text extracted from PDF
 * @returns Formatted markdown string
 */
function convertTextToMarkdown(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Normalize line endings and clean up whitespace
  let markdown = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines to 2
    .trim();

  // Split into lines for processing
  const lines = markdown.split('\n');
  const processedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Skip empty lines (they'll be preserved as paragraph breaks)
    if (!line) {
      processedLines.push('');
      continue;
    }

    // Detect potential headers (lines that are short, all caps, or followed by empty line)
    const isShortLine = line.length < 60;
    const isAllCaps = line === line.toUpperCase() && line.match(/[A-Z]/);
    const nextLineEmpty = i + 1 < lines.length && lines[i + 1].trim() === '';
    const prevLineEmpty = i > 0 && lines[i - 1].trim() === '';
    
    // Header detection heuristics
    if (isShortLine && (isAllCaps || (nextLineEmpty && prevLineEmpty))) {
      // Determine header level based on various factors
      let headerLevel = 2; // Default to h2
      
      if (line.length < 30) headerLevel = 1; // Very short lines are likely main headers
      if (isAllCaps && line.length < 40) headerLevel = 1; // All caps short lines
      
      line = `${'#'.repeat(headerLevel)} ${line}`;
    }
    
    // Detect bullet points and convert to markdown lists
    else if (line.match(/^[\s]*[•·▪▫‣⁃]\s+/) || line.match(/^[\s]*[-*]\s+/)) {
      // Already in a list format, clean it up
      line = line.replace(/^[\s]*[•·▪▫‣⁃]\s+/, '- ');
      line = line.replace(/^[\s]*[-*]\s+/, '- ');
    }
    
    // Detect numbered lists
    else if (line.match(/^[\s]*\d+[\.\)]\s+/)) {
      line = line.replace(/^[\s]*(\d+)[\.\)]\s+/, '$1. ');
    }
    
    // Handle potential table content (lines with multiple spaces/tabs)
    else if (line.includes('\t') || line.match(/\s{4,}/)) {
      // Convert tabs and multiple spaces to single spaces for readability
      line = line.replace(/\s+/g, ' ');
    }

    processedLines.push(line);
  }

  // Join lines back together
  markdown = processedLines.join('\n');

  // Clean up excessive whitespace and ensure proper paragraph spacing
  markdown = markdown
    .replace(/\n{3,}/g, '\n\n') // Limit to double newlines
    .replace(/[ \t]+$/gm, '') // Remove trailing whitespace
    .trim();

  // Ensure the document starts with content
  if (!markdown) {
    return 'No readable text content found in PDF.';
  }

  return markdown;
}

/**
 * Extracts text from PDF buffer and converts to markdown
 * @param buf - Buffer containing PDF file data
 * @returns Object containing the converted markdown string and optional title
 */
export async function extractTextFromPdf(buf: Buffer): Promise<{ markdown: string; title?: string }> {
  try {
    const result = await pdfToMarkdown(buf);
    
    return {
      markdown: result.markdown,
      title: result.title,
    };
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validates if a buffer contains valid PDF data
 * @param buf - Buffer to validate
 * @returns True if buffer appears to be a valid PDF
 */
export function validatePdfBuffer(buf: Buffer): boolean {
  if (!buf || buf.length < 8) {
    return false;
  }
  
  // Check for PDF header signature
  const header = buf.subarray(0, 8).toString('ascii');
  return header.startsWith('%PDF-');
}

/**
 * Extracts metadata from PDF buffer
 * @param buf - Buffer containing PDF file data
 * @returns Object containing PDF metadata
 */
export async function extractPdfMetadata(buf: Buffer): Promise<{
  title?: string;
  author?: string;
  creator?: string;
  producer?: string;
  pages?: number;
  creationDate?: Date;
  modificationDate?: Date;
}> {
  try {
    // Validate that we have a Buffer and not a string
    if (!Buffer.isBuffer(buf)) {
      throw new Error(`Expected Buffer but received ${typeof buf}`);
    }
    
    // Import pdf-parse for metadata extraction
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = pdfParseModule.default;
    
    const data = await pdfParse(buf);
    const info = data.info || {};
    
    return {
      title: info.Title || undefined,
      author: info.Author || undefined,
      creator: info.Creator || undefined,
      producer: info.Producer || undefined,
      pages: data.numpages,
      creationDate: info.CreationDate ? new Date(info.CreationDate) : undefined,
      modificationDate: info.ModDate ? new Date(info.ModDate) : undefined,
    };
  } catch (error) {
    console.error('Error extracting PDF metadata:', error);
    throw new Error(`Failed to extract PDF metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
