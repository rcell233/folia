import * as Y from 'yjs';

import { YjsEditor } from '@/application/slate-yjs';
import {
  addColumnToTable,
  addRowToTable,
  createSimpleTable,
  deleteColumn,
  deleteRow,
} from '@/application/slate-yjs/utils/simple-table-operations';
import { getBlock, getChildrenArray, initializeDocumentStructure } from '@/application/slate-yjs/utils/yjs';
import { BlockType, YSharedRoot, YjsEditorKey } from '@/application/types';

describe('simple table operations', () => {
  function setup() {
    const doc = new Y.Doc();

    initializeDocumentStructure(doc, false);
    const sharedRoot = doc.getMap(YjsEditorKey.data_section) as YSharedRoot;
    const document = sharedRoot.get(YjsEditorKey.document);
    const pageId = document.get(YjsEditorKey.page_id) as string;
    const editor = { sharedRoot } as YjsEditor;

    return { editor, pageId, sharedRoot };
  }

  function dimensions(sharedRoot: YSharedRoot, tableId: string) {
    const table = getBlock(tableId, sharedRoot)!;
    const rowIds = getChildrenArray(table.get(YjsEditorKey.block_children), sharedRoot)!.toArray();
    const columns = rowIds.map((rowId) => {
      const row = getBlock(rowId, sharedRoot)!;

      return getChildrenArray(row.get(YjsEditorKey.block_children), sharedRoot)!.length;
    });

    return { rows: rowIds.length, columns };
  }

  it('creates an editable 2 by 2 table using the existing durable block format', () => {
    const { editor, pageId, sharedRoot } = setup();
    const tableId = createSimpleTable(editor, pageId, 2, 2)!;
    const table = getBlock(tableId, sharedRoot)!;

    expect(table.get(YjsEditorKey.block_type)).toBe(BlockType.SimpleTableBlock);
    expect(dimensions(sharedRoot, tableId)).toEqual({ rows: 2, columns: [2, 2] });
  });

  it('keeps the table rectangular while adding and deleting rows and columns', () => {
    const { editor, pageId, sharedRoot } = setup();
    const tableId = createSimpleTable(editor, pageId, 2, 2)!;

    addRowToTable(editor, tableId);
    addColumnToTable(editor, tableId);
    expect(dimensions(sharedRoot, tableId)).toEqual({ rows: 3, columns: [3, 3, 3] });

    deleteRow(editor, tableId, 1);
    deleteColumn(editor, tableId, 0);
    expect(dimensions(sharedRoot, tableId)).toEqual({ rows: 2, columns: [2, 2] });
  });
});
