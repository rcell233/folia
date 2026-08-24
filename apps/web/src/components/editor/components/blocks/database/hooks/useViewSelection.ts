import { useCallback, useEffect, useRef, useState } from 'react';

import {
  readDatabaseViewSelection,
  resolveDatabaseViewSelection,
  writeDatabaseViewSelection,
} from '@/utils/database-view-selection';

interface UseViewSelectionProps {
  /**
   * The initial/default view ID
   */
  viewId: string;
  /**
   * Available view IDs to select from
   */
  visibleViewIds: string[];
}

interface UseViewSelectionResult {
  selectedViewId: string;
  onChangeView: (viewId: string) => void;
  /**
   * Called when a new view is added. Updates selection to the new view.
   */
  onViewAddedSelection: (newViewId: string) => void;
}

/**
 * Hook for managing view selection state.
 *
 * Handles:
 * - Current selected view ID
 * - Switching between views
 * - Auto-selecting first view when current becomes invalid
 * - Selecting newly added views
 */
export function useViewSelection({
  viewId,
  visibleViewIds,
}: UseViewSelectionProps): UseViewSelectionResult {
  const [selectedViewId, setSelectedViewId] = useState<string>(viewId);
  const initialSelectionDoneRef = useRef(false);

  // Auto-select appropriate view when visibleViewIds changes
  useEffect(() => {
    if (!initialSelectionDoneRef.current && visibleViewIds.length > 0) {
      const initialView = resolveDatabaseViewSelection({
        routeViewId: viewId,
        storedViewId: readDatabaseViewSelection(viewId),
        validViewIds: visibleViewIds,
      });

      setSelectedViewId(initialView);
      writeDatabaseViewSelection(viewId, initialView);
      initialSelectionDoneRef.current = true;
    } else if (initialSelectionDoneRef.current && visibleViewIds.length > 0) {
      // After initial: ensure selected view is still valid
      setSelectedViewId((current) => {
        if (visibleViewIds.includes(current)) {
          return current;
        }

        return visibleViewIds[0] ?? viewId;
      });
    }
  }, [viewId, visibleViewIds]);

  const onChangeView = useCallback(
    (newViewId: string) => {
      setSelectedViewId(newViewId);
      writeDatabaseViewSelection(viewId, newViewId);
    },
    [viewId]
  );

  /**
   * Called when a new view is added (e.g., via + button).
   * Automatically selects the newly added view.
   */
  const onViewAddedSelection = useCallback(
    (newViewId: string) => {
      setSelectedViewId(newViewId);
      writeDatabaseViewSelection(viewId, newViewId);
    },
    [viewId]
  );

  return { selectedViewId, onChangeView, onViewAddedSelection };
}
