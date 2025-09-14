/**
 * Markdown Chunking by Headings
 * 
 * Splits markdown content into chunks of ~400-800 tokens based on heading structure.
 * Maintains heading hierarchy context and creates overlapping windows when needed.
 */

export interface MarkdownChunk {
  chunkId: string;
  md_text: string;
  tokens: number;
  section?: string;
  meta: {
    hpath: string[];
  };
}

interface HeadingNode {
  level: number;
  title: string;
  content: string;
  startIndex: number;
  endIndex: number;
  children: HeadingNode[];
  parent?: HeadingNode;
}

/**
 * Simple tokenizer: approximates tokens as ceil(words * 1.33)
 */
function estimateTokens(text: string): number {
  const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
  return Math.ceil(words * 1.33);
}

/**
 * Parse markdown content and extract heading hierarchy
 */
function parseHeadings(markdown: string): HeadingNode[] {
  const lines = markdown.split('\n');
  const headings: HeadingNode[] = [];
  const headingStack: HeadingNode[] = [];
  
  let currentContent: string[] = [];
  let lastHeadingIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    
    if (headingMatch) {
      // Save content for previous heading
      if (lastHeadingIndex >= 0 && headings[lastHeadingIndex]) {
        headings[lastHeadingIndex].content = currentContent.join('\n').trim();
        headings[lastHeadingIndex].endIndex = i - 1;
      }
      
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      
      const heading: HeadingNode = {
        level,
        title,
        content: '',
        startIndex: i,
        endIndex: i,
        children: [],
      };
      
      // Find parent in the stack
      while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
        headingStack.pop();
      }
      
      if (headingStack.length > 0) {
        const parent = headingStack[headingStack.length - 1];
        heading.parent = parent;
        parent.children.push(heading);
      }
      
      headingStack.push(heading);
      headings.push(heading);
      lastHeadingIndex = headings.length - 1;
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  
  // Handle last heading's content
  if (lastHeadingIndex >= 0 && headings[lastHeadingIndex]) {
    headings[lastHeadingIndex].content = currentContent.join('\n').trim();
    headings[lastHeadingIndex].endIndex = lines.length - 1;
  }
  
  // Handle content before first heading
  if (headings.length === 0 || headings[0].startIndex > 0) {
    const preContent = lines.slice(0, headings.length > 0 ? headings[0].startIndex : lines.length).join('\n').trim();
    if (preContent) {
      const rootHeading: HeadingNode = {
        level: 0,
        title: 'Introduction',
        content: preContent,
        startIndex: 0,
        endIndex: headings.length > 0 ? headings[0].startIndex - 1 : lines.length - 1,
        children: [],
      };
      headings.unshift(rootHeading);
    }
  }
  
  return headings;
}

/**
 * Build heading path for a given heading node
 */
function buildHeadingPath(heading: HeadingNode): string[] {
  const path: string[] = [];
  let current: HeadingNode | undefined = heading;
  
  while (current) {
    if (current.level > 0) { // Skip root level
      path.unshift(current.title);
    }
    current = current.parent;
  }
  
  return path;
}

/**
 * Create chunks from a heading node, splitting if content is too large
 */
function createChunksFromHeading(
  heading: HeadingNode, 
  markdown: string,
  minTokens: number = 400,
  maxTokens: number = 800
): MarkdownChunk[] {
  const chunks: MarkdownChunk[] = [];
  const headingPath = buildHeadingPath(heading);
  
  // Reconstruct full markdown for this section
  markdown.split('\n');
  let sectionMarkdown = '';
  
  // Add heading line if it's not the root
  if (heading.level > 0) {
    sectionMarkdown = '#'.repeat(heading.level) + ' ' + heading.title + '\n\n';
  }
  
  // Add content
  sectionMarkdown += heading.content;
  
  const totalTokens = estimateTokens(sectionMarkdown);
  
  if (totalTokens <= maxTokens) {
    // Single chunk
    chunks.push({
      chunkId: `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      md_text: sectionMarkdown.trim(),
      tokens: totalTokens,
      section: heading.title !== 'Introduction' ? heading.title : undefined,
      meta: {
        hpath: headingPath,
      },
    });
  } else {
    // Split into multiple chunks
    const contentLines = heading.content.split('\n');
    const headingPrefix = heading.level > 0 ? '#'.repeat(heading.level) + ' ' + heading.title + '\n\n' : '';
    
    let currentChunk = headingPrefix;
    let currentTokens = estimateTokens(headingPrefix);
    let chunkIndex = 0;
    
    for (const line of contentLines) {
      const lineTokens = estimateTokens(line);
      
      if (currentTokens + lineTokens > maxTokens && currentTokens >= minTokens) {
        // Create chunk and start new one
        chunks.push({
          chunkId: `chunk_${Date.now()}_${chunkIndex}_${Math.random().toString(36).substr(2, 9)}`,
          md_text: currentChunk.trim(),
          tokens: currentTokens,
          section: heading.title !== 'Introduction' ? heading.title : undefined,
          meta: {
            hpath: headingPath,
          },
        });
        
        chunkIndex++;
        currentChunk = headingPrefix + line + '\n';
        currentTokens = estimateTokens(headingPrefix) + lineTokens;
      } else {
        currentChunk += line + '\n';
        currentTokens += lineTokens;
      }
    }
    
    // Add final chunk if it has content
    if (currentChunk.trim() !== headingPrefix.trim()) {
      chunks.push({
        chunkId: `chunk_${Date.now()}_${chunkIndex}_${Math.random().toString(36).substr(2, 9)}`,
        md_text: currentChunk.trim(),
        tokens: currentTokens,
        section: heading.title !== 'Introduction' ? heading.title : undefined,
        meta: {
          hpath: headingPath,
        },
      });
    }
  }
  
  return chunks;
}

/**
 * Main function: Chunk markdown content by headings
 * 
 * @param md - Markdown content to chunk
 * @param minTokens - Minimum tokens per chunk (default: 400)
 * @param maxTokens - Maximum tokens per chunk (default: 800)
 * @returns Array of markdown chunks with metadata
 */
export function chunkMarkdown(
  md: string, 
  minTokens: number = 400, 
  maxTokens: number = 800
): MarkdownChunk[] {
  if (!md.trim()) {
    return [];
  }
  
  const headings = parseHeadings(md);
  const chunks: MarkdownChunk[] = [];
  
  for (const heading of headings) {
    const headingChunks = createChunksFromHeading(heading, md, minTokens, maxTokens);
    chunks.push(...headingChunks);
  }
  
  return chunks;
}

/**
 * Utility function to get chunk statistics
 */
export function getChunkingStats(chunks: MarkdownChunk[]): {
  totalChunks: number;
  totalTokens: number;
  averageTokens: number;
  minTokens: number;
  maxTokens: number;
  sections: string[];
} {
  if (chunks.length === 0) {
    return {
      totalChunks: 0,
      totalTokens: 0,
      averageTokens: 0,
      minTokens: 0,
      maxTokens: 0,
      sections: [],
    };
  }
  
  const tokens = chunks.map(c => c.tokens);
  const sections = [...new Set(chunks.map(c => c.section).filter(Boolean))] as string[];
  
  return {
    totalChunks: chunks.length,
    totalTokens: tokens.reduce((sum, t) => sum + t, 0),
    averageTokens: Math.round(tokens.reduce((sum, t) => sum + t, 0) / chunks.length),
    minTokens: Math.min(...tokens),
    maxTokens: Math.max(...tokens),
    sections,
  };
}
