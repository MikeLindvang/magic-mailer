import { JSDOM } from 'jsdom';

/**
 * Converts HTML to clean Markdown, extracting meaningful content
 * while filtering out navigation, ads, and other non-content elements.
 */
export function htmlToMarkdown(html: string): {
  markdown: string;
  title?: string;
  headings: string[];
} {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  // Remove unwanted elements (nav, ads, sidebars, etc.)
  const unwantedSelectors = [
    'nav', 'header', 'footer', 'aside',
    '.nav', '.navigation', '.navbar', '.menu',
    '.sidebar', '.side-bar', '.aside',
    '.ad', '.ads', '.advertisement', '.banner',
    '.social', '.share', '.sharing',
    '.comments', '.comment-section',
    '.related', '.recommended', '.suggestions',
    '.popup', '.modal', '.overlay',
    '.cookie', '.gdpr',
    'script', 'style', 'noscript',
    '[role="banner"]', '[role="navigation"]', '[role="complementary"]'
  ];

  unwantedSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => el.remove());
  });

  // Extract title from h1, title tag, or meta
  let title: string | undefined;
  const h1 = document.querySelector('h1');
  const titleTag = document.querySelector('title');
  const metaTitle = document.querySelector('meta[property="og:title"], meta[name="title"]');
  
  if (h1?.textContent?.trim()) {
    title = h1.textContent.trim();
  } else if (titleTag?.textContent?.trim()) {
    title = titleTag.textContent.trim();
  } else if (metaTitle?.getAttribute('content')?.trim()) {
    title = metaTitle.getAttribute('content')!.trim();
  }

  // Find main content area
  const contentSelectors = [
    'main',
    '[role="main"]',
    '.main',
    '.content',
    '.post-content',
    '.article-content',
    '.entry-content',
    'article',
    '.article'
  ];

  let contentElement: Element | null = null;
  for (const selector of contentSelectors) {
    contentElement = document.querySelector(selector);
    if (contentElement) break;
  }

  // If no main content found, use body but filter more aggressively
  if (!contentElement) {
    contentElement = document.body;
  }

  // Extract headings for the headings array
  const headings: string[] = [];
  const headingElements = contentElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headingElements.forEach(heading => {
    const text = heading.textContent?.trim();
    if (text) {
      headings.push(text);
    }
  });

  // Convert to markdown
  const markdown = convertElementToMarkdown(contentElement);

  return {
    markdown: markdown.trim(),
    title,
    headings
  };
}

/**
 * Recursively converts DOM elements to Markdown
 */
function convertElementToMarkdown(element: Element): string {
  const tagName = element.tagName.toLowerCase();
  const text = element.textContent?.trim() || '';
  
  // Skip empty elements
  if (!text && !['br', 'hr', 'img'].includes(tagName)) {
    return '';
  }

  switch (tagName) {
    case 'h1':
      return `# ${text}\n\n`;
    case 'h2':
      return `## ${text}\n\n`;
    case 'h3':
      return `### ${text}\n\n`;
    case 'h4':
      return `#### ${text}\n\n`;
    case 'h5':
      return `##### ${text}\n\n`;
    case 'h6':
      return `###### ${text}\n\n`;
    
    case 'p':
      return `${processInlineElements(element)}\n\n`;
    
    case 'br':
      return '\n';
    
    case 'hr':
      return '---\n\n';
    
    case 'strong':
    case 'b':
      return `**${text}**`;
    
    case 'em':
    case 'i':
      return `*${text}*`;
    
    case 'code':
      return `\`${text}\``;
    
    case 'pre':
      const codeElement = element.querySelector('code');
      const codeText = codeElement ? codeElement.textContent : text;
      return `\`\`\`\n${codeText}\n\`\`\`\n\n`;
    
    case 'a':
      const href = element.getAttribute('href');
      if (href && href !== '#') {
        return `[${text}](${href})`;
      }
      return text;
    
    case 'img':
      const src = element.getAttribute('src');
      const alt = element.getAttribute('alt') || '';
      if (src) {
        return `![${alt}](${src})`;
      }
      return '';
    
    case 'ul':
      return convertList(element, false) + '\n';
    
    case 'ol':
      return convertList(element, true) + '\n';
    
    case 'li':
      return processInlineElements(element);
    
    case 'blockquote':
      const lines = processInlineElements(element).split('\n');
      return lines.map(line => line.trim() ? `> ${line}` : '>').join('\n') + '\n\n';
    
    case 'table':
      return convertTable(element) + '\n';
    
    case 'div':
    case 'section':
    case 'article':
    case 'main':
      // Process children for block elements
      return processChildren(element);
    
    default:
      // For inline elements, process children and return text
      if (isInlineElement(tagName)) {
        return processInlineElements(element);
      }
      // For unknown block elements, process children
      return processChildren(element);
  }
}

/**
 * Process children of an element
 */
function processChildren(element: Element): string {
  let result = '';
  for (const child of Array.from(element.children)) {
    result += convertElementToMarkdown(child);
  }
  return result;
}

/**
 * Process inline elements and text nodes
 */
function processInlineElements(element: Element): string {
  let result = '';
  
  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === 3) { // Text node
      result += node.textContent || '';
    } else if (node.nodeType === 1) { // Element node
      const el = node as Element;
      result += convertElementToMarkdown(el);
    }
  }
  
  return result;
}

/**
 * Convert list elements to Markdown
 */
function convertList(element: Element, ordered: boolean): string {
  const items = Array.from(element.querySelectorAll(':scope > li'));
  let result = '';
  
  items.forEach((item, index) => {
    const marker = ordered ? `${index + 1}. ` : '- ';
    const content = processInlineElements(item);
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length > 0) {
      result += `${marker}${lines[0]}\n`;
      // Handle multi-line list items
      for (let i = 1; i < lines.length; i++) {
        result += `  ${lines[i]}\n`;
      }
    }
  });
  
  return result;
}

/**
 * Convert table elements to Markdown
 */
function convertTable(element: Element): string {
  const rows = Array.from(element.querySelectorAll('tr'));
  if (rows.length === 0) return '';
  
  let result = '';
  let isFirstRow = true;
  
  rows.forEach(row => {
    const cells = Array.from(row.querySelectorAll('td, th'));
    if (cells.length === 0) return;
    
    const cellContents = cells.map(cell => {
      return processInlineElements(cell).replace(/\n/g, ' ').trim();
    });
    
    result += `| ${cellContents.join(' | ')} |\n`;
    
    // Add header separator after first row
    if (isFirstRow) {
      const separator = cells.map(() => '---').join(' | ');
      result += `| ${separator} |\n`;
      isFirstRow = false;
    }
  });
  
  return result;
}

/**
 * Check if an element is inline
 */
function isInlineElement(tagName: string): boolean {
  const inlineElements = [
    'a', 'abbr', 'acronym', 'b', 'bdi', 'bdo', 'big', 'br', 'button', 'cite', 'code',
    'dfn', 'em', 'i', 'img', 'input', 'kbd', 'label', 'map', 'mark', 'meter', 'noscript',
    'object', 'output', 'progress', 'q', 'ruby', 's', 'samp', 'script', 'select', 'small',
    'span', 'strong', 'sub', 'sup', 'textarea', 'time', 'tt', 'u', 'var', 'wbr'
  ];
  
  return inlineElements.includes(tagName);
}
