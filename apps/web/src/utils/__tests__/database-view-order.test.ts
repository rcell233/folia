import {
  appendDatabaseViewId,
  readDatabaseViewOrder,
  reconcileDatabaseViewOrder,
  writeDatabaseViewOrder,
} from '@/utils/database-view-order';

describe('database view order', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('keeps the stored order while reconciling created and deleted views', () => {
    expect(reconcileDatabaseViewOrder(['board', 'grid', 'deleted'], ['grid', 'board', 'calendar'])).toEqual([
      'board',
      'grid',
      'calendar',
    ]);
  });

  it('appends a newly created view exactly once', () => {
    expect(appendDatabaseViewId(['grid', 'board'], 'board')).toEqual(['grid', 'board']);
    expect(appendDatabaseViewId(['grid', 'board'], 'calendar')).toEqual(['grid', 'board', 'calendar']);
  });

  it('persists a deduplicated order per database', () => {
    writeDatabaseViewOrder('database-1', ['board', 'grid', 'board']);

    expect(readDatabaseViewOrder('database-1')).toEqual(['board', 'grid']);
    expect(readDatabaseViewOrder('database-2')).toBeUndefined();
  });

  it('ignores malformed stored values', () => {
    window.localStorage.setItem('database_view_order:database-1', JSON.stringify(['grid', 1]));

    expect(readDatabaseViewOrder('database-1')).toBeUndefined();
  });
});
