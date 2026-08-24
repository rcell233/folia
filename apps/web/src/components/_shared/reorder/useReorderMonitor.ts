import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { reorder } from '@atlaskit/pragmatic-drag-and-drop/reorder';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { getReorderDestinationIndex } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index';
import { useEffect, useRef } from 'react';

export interface ReorderResult {
  movedId: string;
  prevId: string | null;
  nextIds: string[];
  fromIndex: number;
  toIndex: number;
}

interface UseReorderMonitorParams {
  dragType: string;
  instanceId: symbol;
  axis: 'vertical' | 'horizontal';
  enabled: boolean;
  getOrderedIds: () => string[];
  onReorder: (result: ReorderResult) => void;
}

export function useReorderMonitor({
  dragType,
  instanceId,
  axis,
  enabled,
  getOrderedIds,
  onReorder,
}: UseReorderMonitorParams): void {
  const getOrderedIdsRef = useRef(getOrderedIds);
  const onReorderRef = useRef(onReorder);

  useEffect(() => {
    getOrderedIdsRef.current = getOrderedIds;
    onReorderRef.current = onReorder;
  });

  useEffect(() => {
    if (!enabled) return;

    return combine(
      monitorForElements({
        canMonitor: ({ source }) => source.data.type === dragType && source.data.instanceId === instanceId,
        onDrop({ location, source }) {
          const target = location.current.dropTargets[0];

          if (!target) return;

          const sourceId = String(source.data.id ?? '');
          const targetId = String(target.data.id ?? '');

          if (!sourceId || !targetId || sourceId === targetId) return;

          const orderedIds = getOrderedIdsRef.current();
          const startIndex = orderedIds.indexOf(sourceId);
          const indexOfTarget = orderedIds.indexOf(targetId);

          if (startIndex < 0 || indexOfTarget < 0) return;

          const finishIndex = getReorderDestinationIndex({
            startIndex,
            indexOfTarget,
            closestEdgeOfTarget: extractClosestEdge(target.data),
            axis,
          });

          if (finishIndex === startIndex) return;

          const nextIds = reorder({ list: orderedIds, startIndex, finishIndex });
          const prevId = finishIndex > 0 ? nextIds[finishIndex - 1] ?? null : null;

          onReorderRef.current({
            movedId: sourceId,
            prevId,
            nextIds,
            fromIndex: startIndex,
            toIndex: finishIndex,
          });
        },
      })
    );
  }, [axis, dragType, enabled, instanceId]);
}
