const DATABASE_VIEW_ORDER_STORAGE_KEY_PREFIX = 'database_view_order:';

function storageKey(databaseId: string) {
  return `${DATABASE_VIEW_ORDER_STORAGE_KEY_PREFIX}${databaseId}`;
}

export function reconcileDatabaseViewOrder(previousIds: string[], incomingIds: string[]): string[] {
  const incomingSet = new Set(incomingIds);
  const previousSet = new Set(previousIds);
  const retainedIds = previousIds.filter((viewId) => incomingSet.has(viewId));
  const appendedIds = incomingIds.filter((viewId) => !previousSet.has(viewId));

  return [...retainedIds, ...appendedIds];
}

export function appendDatabaseViewId(viewIds: string[], newViewId: string): string[] {
  return [...viewIds.filter((viewId) => viewId !== newViewId), newViewId];
}

export function readDatabaseViewOrder(databaseId?: string): string[] | undefined {
  if (!databaseId || typeof window === 'undefined') return undefined;

  try {
    const rawValue = window.localStorage.getItem(storageKey(databaseId));

    if (!rawValue) return undefined;

    const parsedValue: unknown = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue) || parsedValue.some((value) => typeof value !== 'string')) {
      return undefined;
    }

    return parsedValue;
  } catch {
    return undefined;
  }
}

export function writeDatabaseViewOrder(databaseId: string | undefined, viewIds: string[]) {
  if (!databaseId || typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(storageKey(databaseId), JSON.stringify(Array.from(new Set(viewIds))));
  } catch {
    // Private mode and storage quota failures must not block database use.
  }
}
