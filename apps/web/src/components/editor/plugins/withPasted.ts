import { BasePoint, Editor, Element, Range, Text, Transforms } from 'slate';
import { ReactEditor } from 'slate-react';

import { YjsEditor } from '@/application/slate-yjs';
import { SOFT_BREAK_TYPES } from '@/application/slate-yjs/command/const';
import { EditorMarkFormat } from '@/application/slate-yjs/types';
import { getBlockEntry } from '@/application/slate-yjs/utils/editor';
import { BlockType, MentionType, YjsEditorKey } from '@/application/types';
import { parseHTML } from '@/components/editor/parsers/html-parser';
import { parseMarkdown } from '@/components/editor/parsers/markdown-parser';
import { parseTSVTable } from '@/components/editor/parsers/table-parser';
import { ParsedBlock } from '@/components/editor/parsers/types';
import { insertBlocksAtCaret } from '@/components/editor/utils/insert-blocks-at-caret';
import { detectMarkdown, detectTSV } from '@/components/editor/utils/markdown-detector';
import { parseAppFlowyPageLink, processUrl, workspaceIdFromAppPathname } from '@/utils/url';

/**
 * Enhances Slate editor with improved paste handling
 * Features:
 * - AST-based HTML parsing (reliable, secure)
 * - Markdown detection and parsing
 * - Smart merge logic (context-aware)
 * - URL detection (links, videos, page refs)
 * - Table support
 */
export const withPasted = (editor: ReactEditor) => {
  /**
   * Main paste handler - processes clipboard data
   */
  editor.insertTextData = (data: DataTransfer) => {
    // Code blocks accept clipboard contents as plain text. Rich clipboard
    // formats would otherwise be parsed into sibling blocks below the code.
    const entry = getBlockEntry(editor as YjsEditor);

    if (entry) {
      const [node] = entry;

      if (SOFT_BREAK_TYPES.includes(node.type as BlockType)) {
        const text = data.getData('text/plain');

        if (text) {
          editor.insertText(text);
          return true;
        }
      }
    }

    const html = data.getData('text/html');
    const text = data.getData('text/plain');

    // Priority 1: HTML (if available)
    if (html && html.trim().length > 0) {
      console.log('[AppFlowy] Handling HTML paste', html);
      return handleHTMLPaste(editor, html, text);
    }

    // Priority 2: Plain text
    if (text && text.trim().length > 0) {
      console.log('[AppFlowy] Handling Plain Text paste', text);
      return handlePlainTextPaste(editor, text);
    }

    return false;
  };

  return editor;
};

/**
 * Handles HTML paste using AST-based parsing
 */
function handleHTMLPaste(editor: ReactEditor, html: string, fallbackText?: string): boolean {
  try {
    // Parse HTML to structured blocks
    const blocks = parseHTML(html);

    console.log('[AppFlowy] Parsed HTML blocks:', JSON.stringify(blocks, null, 2));

    if (blocks.length === 0) {
      // If HTML parsing fails, fallback to plain text
      if (fallbackText) {
        return handlePlainTextPaste(editor, fallbackText);
      }

      return false;
    }

    // Insert blocks through YJS
    return insertParsedBlocks(editor, blocks);
  } catch (error) {
    console.error('Error handling HTML paste:', error);
    return false;
  }
}

/**
 * Handles plain text paste with URL detection and Markdown support
 */
function handlePlainTextPaste(editor: ReactEditor, text: string): boolean {
  const lines = text.split(/\r\n|\r|\n/);
  const lineLength = lines.filter(Boolean).length;

  // Special case: Single line
  if (lineLength === 1) {
    const pastedText = text.trim();
    const isUrl = !!processUrl(pastedText);

    if (isUrl) {
      return handleURLPaste(editor, pastedText);
    }

    // Check if it's Markdown (even for single line)
    if (detectMarkdown(text)) {
      return handleMarkdownPaste(editor, text);
    }

    // If not URL and not Markdown, insert as plain text
    const point = editor.selection?.anchor as BasePoint;

    if (point) {
      Transforms.insertNodes(editor, { text }, { at: point, select: true, voids: false });
      return true;
    }

    return false;
  }

  // Multi-line text: Check if it's Markdown
  if (detectMarkdown(text)) {
    return handleMarkdownPaste(editor, text);
  }

  // Check for TSV
  if (detectTSV(text)) {
    return handleTSVPaste(editor, text);
  }

  // Plain multi-line text: Create paragraphs
  return handleMultiLinePlainText(editor, lines);
}

/**
 * Handles TSV paste
 */
function handleTSVPaste(editor: ReactEditor, tsv: string): boolean {
  try {
    const block = parseTSVTable(tsv);

    if (!block) {
      return false;
    }

    return insertParsedBlocks(editor, [block]);
  } catch (error) {
    console.error('Error handling TSV paste:', error);
    return false;
  }
}

/**
 * Handles Markdown paste
 */
function handleMarkdownPaste(editor: ReactEditor, markdown: string): boolean {
  try {
    // Parse Markdown to structured blocks
    const blocks = parseMarkdown(markdown);

    if (blocks.length === 0) {
      return false;
    }

    // Insert blocks directly
    return insertParsedBlocks(editor, blocks);
  } catch (error) {
    console.error('Error handling Markdown paste:', error);
    return false;
  }
}

/**
 * Handles URL paste (link previews, videos, page references)
 */
function handleURLPaste(editor: ReactEditor, url: string): boolean {
  const appFlowyPageLink = parseAppFlowyPageLink(url, window.location.hostname);
  const currentWorkspaceId = workspaceIdFromAppPathname(window.location.pathname);

  if (
    appFlowyPageLink &&
    currentWorkspaceId &&
    appFlowyPageLink.workspaceId.toLowerCase() === currentWorkspaceId.toLowerCase()
  ) {
    const point = editor.selection?.anchor as BasePoint;

    if (point) {
      Transforms.insertNodes(
        editor,
        {
          text: '@',
          mention: {
            type: MentionType.PageRef,
            page_id: appFlowyPageLink.viewId,
            ...(appFlowyPageLink.blockId ? { block_id: appFlowyPageLink.blockId } : {}),
          },
        },
        { at: point, select: true, voids: false }
      );

      return true;
    }
  }

  return insertLinkedURLText(editor, url);
}

function insertLinkedURLText(editor: ReactEditor, url: string): boolean {
  const href = processUrl(url) || url;

  if (!editor.selection) return false;

  if (Range.isExpanded(editor.selection)) {
    Transforms.delete(editor);
  }

  const point = editor.selection?.anchor as BasePoint | undefined;

  if (!point) return false;

  editor.insertText(url);

  const end = editor.selection ? Range.end(editor.selection) : { path: point.path, offset: point.offset + url.length };
  const start = { path: [...end.path], offset: Math.max(0, end.offset - url.length) };
  const insertedRange: Range = { anchor: start, focus: { path: [...end.path], offset: end.offset } };

  if (Editor.hasPath(editor, start.path) && editor.string(insertedRange) === url) {
    Transforms.select(editor, insertedRange);
    editor.addMark(EditorMarkFormat.Href, href);
    Transforms.select(editor, insertedRange);
    Transforms.collapse(editor, { edge: 'end' });
  }

  return true;
}

/**
 * Handles multi-line plain text (no Markdown)
 */
function handleMultiLinePlainText(editor: ReactEditor, lines: string[]): boolean {
  const blocks = lines
    .filter(Boolean)
    .map((line) => ({
      type: BlockType.Paragraph,
      data: {},
      text: line,
      formats: [],
      children: [],
    }));

  return insertParsedBlocks(editor, blocks);
}

/**
 * Converts ParsedBlock to Slate Element with proper text wrapper
 */
function parsedBlockToSlateElement(block: ParsedBlock): Element {
  const { type, data, children } = block;

  // Convert text + formats to Slate text nodes
  const textNodes = parsedBlockToTextNodes(block);

  // Create children - text wrapper + any nested blocks
  const slateChildren: (Element | Text)[] = [
    { type: YjsEditorKey.text, children: textNodes } as Element,
    ...children.map(parsedBlockToSlateElement),
  ];

  return {
    type,
    data,
    children: slateChildren,
  } as Element;
}

/**
 * Converts ParsedBlock text to Slate text nodes with formats
 */
function parsedBlockToTextNodes(block: ParsedBlock): Text[] {
  const { text, formats } = block;

  if (formats.length === 0) {
    return [{ text }];
  }

  // Create segments based on format boundaries
  const boundaries = new Set<number>([0, text.length]);

  formats.forEach((format) => {
    boundaries.add(format.start);
    boundaries.add(format.end);
  });

  const positions = Array.from(boundaries).sort((a, b) => a - b);
  const nodes: Text[] = [];

  for (let i = 0; i < positions.length - 1; i++) {
    const start = positions[i];
    const end = positions[i + 1];
    const segment = text.slice(start, end);

    if (segment.length === 0) continue;

    // Find all formats that apply to this segment
    const activeFormats = formats.filter((format) => format.start <= start && format.end >= end);

    // Build attributes object
    const attributes: Record<string, unknown> = {};

    activeFormats.forEach((format) => {
      switch (format.type) {
        case 'bold':
          attributes.bold = true;
          break;
        case 'italic':
          attributes.italic = true;
          break;
        case 'underline':
          attributes.underline = true;
          break;
        case 'strikethrough':
          attributes.strikethrough = true;
          break;
        case 'code':
          attributes.code = true;
          break;
        case 'link':
          attributes.href = format.data?.href;
          break;
        case 'color':
          attributes.font_color = format.data?.color;
          break;
        case 'bgColor':
          attributes.bg_color = format.data?.bgColor;
          break;
      }
    });

    nodes.push({ text: segment, ...attributes } as Text);
  }

  return nodes;
}

/**
 * Inserts parsed blocks into the editor using YJS
 */
function insertParsedBlocks(editor: ReactEditor, blocks: ParsedBlock[]): boolean {
  if (blocks.length === 0) return false;

  try {
    const first = blocks[0];
    const mergeFirstBlockInline =
      first.type === BlockType.Paragraph && first.children.length === 0 && first.text.length > 0;

    return insertBlocksAtCaret(editor as YjsEditor, blocks.map(parsedBlockToSlateElement), {
      mergeFirstBlockInline,
    });
  } catch (error) {
    console.error('Error inserting parsed blocks:', error);
    return false;
  }
}
