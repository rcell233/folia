import { Element, Text } from 'slate';

import { YjsEditorKey } from '@/application/types';
import { InlineFormat, ParsedBlock } from '@/components/editor/parsers/types';

/** Convert parsed Markdown blocks into Slate nodes accepted by the Yjs converter. */
export function parsedBlockToSlateElement(block: ParsedBlock): Element {
  const textNodes = parsedBlockToTextNodes(block);
  const slateChildren: (Element | Text)[] = [
    { type: YjsEditorKey.text, children: textNodes } as unknown as Element,
    ...block.children.map(parsedBlockToSlateElement),
  ];

  return {
    type: block.type,
    data: block.data,
    children: slateChildren,
  } as unknown as Element;
}

function parsedBlockToTextNodes(block: ParsedBlock): Text[] {
  const { text, formats } = block;

  if (formats.length === 0) return [{ text }];

  const boundaries = new Set<number>([0, text.length]);

  formats.forEach((format: InlineFormat) => {
    boundaries.add(format.start);
    boundaries.add(format.end);
  });

  const positions = Array.from(boundaries).sort((a, b) => a - b);
  const nodes: Text[] = [];

  for (let index = 0; index < positions.length - 1; index++) {
    const start = positions[index];
    const end = positions[index + 1];
    const segment = text.slice(start, end);

    if (segment.length === 0) continue;

    const active = formats.filter((format) => format.start <= start && format.end >= end);
    const attributes: Record<string, unknown> = {};

    active.forEach((format) => {
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
