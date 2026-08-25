import { createEditor, Editor, Element, Node, Transforms } from 'slate';
import { withReact } from 'slate-react';
import * as Y from 'yjs';

import { withYjs, YjsEditor } from '@/application/slate-yjs';
import { createBlock, getBlock, getPageId, getText, initializeDocumentStructure, updateBlockParent } from '@/application/slate-yjs/utils/yjs';
import { BlockType, CollabOrigin, YjsEditorKey, YSharedRoot } from '@/application/types';
import { withPasted } from '@/components/editor/plugins/withPasted';

jest.mock('@/components/editor/parsers/html-parser', () => ({
  parseHTML: jest.fn(() => [
    {
      type: 'paragraph',
      data: {},
      text: 'Example',
      formats: [{ type: 'link', start: 0, end: 7, data: { href: 'https://example.com' } }],
      children: [],
    },
  ]),
}));

jest.mock('@/components/editor/parsers/markdown-parser', () => ({
  parseMarkdown: jest.fn(() => []),
}));

function createDataTransfer(plainText: string, html = ''): DataTransfer {
  return {
    getData(type: string) {
      if (type === 'text/plain') return plainText;
      if (type === 'text/html') return html;
      return '';
    },
  } as DataTransfer;
}

function createEditorWithBlock(type: BlockType, text: string): YjsEditor {
  const doc = new Y.Doc();

  initializeDocumentStructure(doc, false);
  const sharedRoot = doc.getMap(YjsEditorKey.data_section) as YSharedRoot;
  const page = getBlock(getPageId(sharedRoot), sharedRoot)!;
  const block = createBlock(sharedRoot, { ty: type, data: {} });
  const yText = getText(block.get(YjsEditorKey.block_external_id), sharedRoot)!;

  yText.insert(0, text);
  updateBlockParent(sharedRoot, block, page, 0);

  const editor = withPasted(
    withReact(
      withYjs(createEditor(), doc, {
        readOnly: false,
        localOrigin: CollabOrigin.Local,
      })
    )
  ) as YjsEditor;

  editor.connect();
  return editor;
}

describe('withPasted caret-aware paste', () => {
  it('inserts a plain URL as an inline link at the caret', () => {
    const editor = createEditorWithBlock(BlockType.Paragraph, 'before after');
    const url = 'https://example.com';

    Transforms.select(editor, { path: [0, 0, 0], offset: 6 });

    const handled = editor.insertTextData(createDataTransfer(url));

    expect(handled).toBe(true);
    expect(Node.string(editor.children[0])).toBe(`before${url} after`);
    expect(editor.children).toHaveLength(1);

    const leaves = ((editor.children[0] as Element).children[0] as Element).children;

    expect(leaves).toContainEqual(expect.objectContaining({ text: url, href: url }));
    editor.disconnect();
  });

  it('merges an HTML hyperlink into the current paragraph at the caret', () => {
    const editor = createEditorWithBlock(BlockType.Paragraph, 'before after');

    Transforms.select(editor, { path: [0, 0, 0], offset: 6 });

    const handled = editor.insertTextData(
      createDataTransfer('Example', '<a href="https://example.com">Example</a>')
    );

    expect(handled).toBe(true);
    expect(Node.string(editor.children[0])).toBe('beforeExample after');
    expect(editor.children).toHaveLength(1);

    const leaves = ((editor.children[0] as Element).children[0] as Element).children;

    expect(leaves).toContainEqual(expect.objectContaining({ text: 'Example', href: 'https://example.com' }));
    editor.disconnect();
  });

  it('pastes rich multiline clipboard content as plain text inside a code block', () => {
    const editor = createEditorWithBlock(BlockType.CodeBlock, 'before after');

    Transforms.select(editor, { path: [0, 0, 0], offset: 6 });

    const handled = editor.insertTextData(
      createDataTransfer('const a = 1;\nconst b = 2;', '<pre><code>const a = 1;\nconst b = 2;</code></pre>')
    );

    expect(handled).toBe(true);
    expect(Node.string(editor.children[0])).toBe('beforeconst a = 1;\nconst b = 2; after');
    expect(editor.children).toHaveLength(1);
    expect(Editor.above(editor, { match: (node) => Element.isElement(node) && node.type === BlockType.CodeBlock })).toBeTruthy();
    editor.disconnect();
  });
});
