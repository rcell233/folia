import {
  readDatabaseViewSelection,
  resolveDatabaseViewSelection,
  writeDatabaseViewSelection,
} from '@/utils/database-view-selection';

describe('database view selection', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persists the last selected view per database page', () => {
    writeDatabaseViewSelection('database-page-1', 'board');

    expect(readDatabaseViewSelection('database-page-1')).toBe('board');
    expect(readDatabaseViewSelection('database-page-2')).toBeUndefined();
  });

  it('prefers an explicit valid view link over the stored selection', () => {
    expect(
      resolveDatabaseViewSelection({
        routeViewId: 'grid',
        tabViewId: 'calendar',
        storedViewId: 'board',
        validViewIds: ['grid', 'board', 'calendar'],
      })
    ).toBe('calendar');
  });

  it('restores the stored selection when the URL has no valid view', () => {
    expect(
      resolveDatabaseViewSelection({
        routeViewId: 'grid',
        storedViewId: 'board',
        validViewIds: ['grid', 'board'],
      })
    ).toBe('board');
  });

  it('falls back safely when the stored view was deleted', () => {
    expect(
      resolveDatabaseViewSelection({
        routeViewId: 'container',
        storedViewId: 'deleted-board',
        validViewIds: ['grid', 'calendar'],
      })
    ).toBe('grid');
  });
});
