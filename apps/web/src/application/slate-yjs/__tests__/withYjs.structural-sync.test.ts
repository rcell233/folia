import { createEditor, Editor, Transforms } from 'slate';
import * as Y from 'yjs';

import { withYjs } from '@/application/slate-yjs/plugins/withYjs';
import {
  createBlock,
  getBlock,
  getChildrenArray,
  getPageId,
  initializeDocumentStructure,
  updateBlockParent,
} from '@/application/slate-yjs/utils/yjs';
import { BlockType, CollabOrigin, YjsEditorKey, YSharedRoot } from '@/application/types';

describe('withYjs structural synchronization', () => {
  it('reconciles a batch whose first emitted block belongs at a later root index', () => {
    const doc = new Y.Doc();

    initializeDocumentStructure(doc, false);
    const editor = withYjs(createEditor(), doc, {
      readOnly: false,
      localOrigin: CollabOrigin.Local,
    });

    editor.connect();

    const sharedRoot = doc.getMap(YjsEditorKey.data_section) as YSharedRoot;
    const pageId = getPageId(sharedRoot);
    const page = getBlock(pageId, sharedRoot)!;

    // Inserting every new block at index 0 makes the first emitted Y.Map key
    // end up at final index 46. Incremental replay used to throw at path [46].
    doc.transact(() => {
      for (let index = 0; index < 47; index++) {
        const block = createBlock(sharedRoot, {
          ty: BlockType.Paragraph,
          data: {},
        });

        updateBlockParent(sharedRoot, block, page, 0);
      }
    }, CollabOrigin.Remote);

    const yOrder = getChildrenArray(page.get(YjsEditorKey.block_children), sharedRoot)!.toArray();
    const slateOrder = editor.children.map((node) => ('blockId' in node ? node.blockId : undefined));

    expect(slateOrder).toEqual(yOrder);
    editor.disconnect();
  });

  it('keeps the selection attached to the same block when a remote sibling is inserted before it', () => {
    const doc = new Y.Doc();

    initializeDocumentStructure(doc, false);
    const sharedRoot = doc.getMap(YjsEditorKey.data_section) as YSharedRoot;
    const pageId = getPageId(sharedRoot);
    const page = getBlock(pageId, sharedRoot)!;
    const first = createBlock(sharedRoot, { ty: BlockType.Paragraph, data: {} });
    const selected = createBlock(sharedRoot, { ty: BlockType.Paragraph, data: {} });

    updateBlockParent(sharedRoot, first, page, 0);
    updateBlockParent(sharedRoot, selected, page, 1);

    const editor = withYjs(createEditor(), doc, {
      readOnly: false,
      localOrigin: CollabOrigin.Local,
    });

    editor.connect();
    Transforms.select(editor, Editor.start(editor, [1]));

    doc.transact(() => {
      const inserted = createBlock(sharedRoot, { ty: BlockType.Paragraph, data: {} });

      updateBlockParent(sharedRoot, inserted, page, 0);
    }, CollabOrigin.Remote);

    expect(editor.selection?.anchor.path[0]).toBe(2);
    expect('blockId' in editor.children[2] ? editor.children[2].blockId : undefined).toBe(
      selected.get(YjsEditorKey.block_id)
    );
    editor.disconnect();
  });
});
