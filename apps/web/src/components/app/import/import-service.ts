import * as Y from 'yjs';

import { getCollab, updateCollab } from '@/application/services/js-services/http/http_api';
import { slateContentInsertToYData } from '@/application/slate-yjs/utils/convert';
import { deleteBlock, getBlock, getChildrenArray, getPageId } from '@/application/slate-yjs/utils/yjs';
import { Types, YjsEditorKey, YSharedRoot } from '@/application/types';
import { parsedBlockToSlateElement } from '@/components/app/import/markdown-to-blocks';
import { parseMarkdown } from '@/components/editor/parsers/markdown-parser';

export function stripFileExtension(name: string): string {
  const dot = name.lastIndexOf('.');

  return dot > 0 ? name.slice(0, dot) : name;
}

/** Populate a newly-created document using the same local Yjs conversion as AppFlowy Web. */
export async function populateDocumentWithMarkdown(workspaceId: string, viewId: string, file: File): Promise<void> {
  const [text, collab] = await Promise.all([file.text(), getCollab(workspaceId, viewId, Types.Document)]);
  const blocks = parseMarkdown(text);

  if (blocks.length === 0) return;

  const doc = new Y.Doc();

  Y.applyUpdate(doc, collab.data);

  const sharedRoot = doc.getMap(YjsEditorKey.data_section) as YSharedRoot;
  const pageId = getPageId(sharedRoot);
  const pageBlock = getBlock(pageId, sharedRoot);

  if (!pageBlock) throw new Error('Imported document has no root page block');

  const childrenArray = getChildrenArray(pageBlock.get(YjsEditorKey.block_children), sharedRoot);
  const existingChildIds = childrenArray ? childrenArray.toArray() : [];
  const slateNodes = blocks.map(parsedBlockToSlateElement);

  doc.transact(() => {
    existingChildIds.forEach((id) => deleteBlock(sharedRoot, id));
    slateContentInsertToYData(pageId, 0, slateNodes, doc);
  });

  await updateCollab(workspaceId, viewId, Types.Document, Y.encodeStateAsUpdate(doc), { version_vector: 0 });
}
