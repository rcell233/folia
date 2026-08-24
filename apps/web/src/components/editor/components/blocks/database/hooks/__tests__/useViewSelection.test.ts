import { act, renderHook, waitFor } from '@testing-library/react';

import { useViewSelection } from '@/components/editor/components/blocks/database/hooks/useViewSelection';
import { readDatabaseViewSelection, writeDatabaseViewSelection } from '@/utils/database-view-selection';

describe('useViewSelection', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('restores and updates the last selected embedded database view', async () => {
    writeDatabaseViewSelection('grid', 'board');

    const { result } = renderHook(() =>
      useViewSelection({
        viewId: 'grid',
        visibleViewIds: ['grid', 'board'],
      })
    );

    await waitFor(() => expect(result.current.selectedViewId).toBe('board'));

    act(() => result.current.onChangeView('grid'));

    expect(result.current.selectedViewId).toBe('grid');
    expect(readDatabaseViewSelection('grid')).toBe('grid');
  });

  it('ignores a stored view that is no longer visible', async () => {
    writeDatabaseViewSelection('grid', 'deleted-board');

    const { result } = renderHook(() =>
      useViewSelection({
        viewId: 'grid',
        visibleViewIds: ['grid', 'calendar'],
      })
    );

    await waitFor(() => expect(result.current.selectedViewId).toBe('grid'));
  });
});
