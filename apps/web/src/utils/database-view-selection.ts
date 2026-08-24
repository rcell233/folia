const DATABASE_VIEW_SELECTION_STORAGE_KEY_PREFIX = 'database_view_selection:';

function storageKey(databasePageId: string) {
  return `${DATABASE_VIEW_SELECTION_STORAGE_KEY_PREFIX}${databasePageId}`;
}

export function readDatabaseViewSelection(databasePageId?: string): string | undefined {
  if (!databasePageId || typeof window === 'undefined') return undefined;

  try {
    return window.localStorage.getItem(storageKey(databasePageId)) || undefined;
  } catch {
    return undefined;
  }
}

export function writeDatabaseViewSelection(databasePageId: string | undefined, viewId: string) {
  if (!databasePageId || !viewId || typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(storageKey(databasePageId), viewId);
  } catch {
    // Private mode and storage quota failures must not block database use.
  }
}

export function resolveDatabaseViewSelection({
  routeViewId,
  tabViewId,
  storedViewId,
  validViewIds,
}: {
  routeViewId: string;
  tabViewId?: string | null;
  storedViewId?: string;
  validViewIds: string[];
}): string {
  if (validViewIds.length === 0) return tabViewId || storedViewId || routeViewId;

  const validViewIdSet = new Set(validViewIds);

  if (tabViewId && validViewIdSet.has(tabViewId)) return tabViewId;
  if (storedViewId && validViewIdSet.has(storedViewId)) return storedViewId;
  if (validViewIdSet.has(routeViewId)) return routeViewId;

  return validViewIds[0];
}
