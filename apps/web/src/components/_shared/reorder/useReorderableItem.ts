import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { attachClosestEdge, extractClosestEdge, type Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';

export type ReorderableItemDragState =
  | { type: 'idle' }
  | { type: 'dragging' }
  | { type: 'over'; closestEdge: Edge | null };

const idleState: ReorderableItemDragState = { type: 'idle' };

interface UseReorderableItemParams {
  elementRef: RefObject<HTMLElement | null>;
  id: string;
  dragType: string;
  instanceId?: symbol;
  canDrag: boolean;
  allowedEdges: Edge[];
}

export function useReorderableItem({
  elementRef,
  id,
  dragType,
  instanceId,
  canDrag,
  allowedEdges,
}: UseReorderableItemParams) {
  const [dragState, setDragState] = useState<ReorderableItemDragState>(idleState);
  const suppressClickRef = useRef(false);
  const suppressClickTimeoutRef = useRef<number>();
  const allowedEdgesKey = allowedEdges.join(',');

  useEffect(() => {
    return () => {
      if (suppressClickTimeoutRef.current !== undefined) {
        window.clearTimeout(suppressClickTimeoutRef.current);
      }
    };
  }, []);

  const shouldSuppressClick = useCallback(() => {
    if (!suppressClickRef.current) return false;

    suppressClickRef.current = false;
    if (suppressClickTimeoutRef.current !== undefined) {
      window.clearTimeout(suppressClickTimeoutRef.current);
      suppressClickTimeoutRef.current = undefined;
    }

    return true;
  }, []);

  useEffect(() => {
    const element = elementRef.current;

    if (!instanceId || !element) return;

    const data = { type: dragType, instanceId, id };
    const edges = allowedEdgesKey.split(',') as Edge[];
    const cleanups: Array<() => void> = [];

    if (canDrag) {
      cleanups.push(
        draggable({
          element,
          getInitialData: () => data,
          onDragStart() {
            suppressClickRef.current = true;
            setDragState({ type: 'dragging' });
          },
          onDrop() {
            suppressClickTimeoutRef.current = window.setTimeout(() => {
              suppressClickRef.current = false;
              suppressClickTimeoutRef.current = undefined;
            }, 0);
            setDragState(idleState);
          },
        })
      );
    }

    cleanups.push(
      dropTargetForElements({
        element,
        canDrop: ({ source }) =>
          source.data.type === dragType && source.data.instanceId === instanceId && source.data.id !== id,
        getIsSticky: () => true,
        getData: ({ input }) => attachClosestEdge(data, { element, input, allowedEdges: edges }),
        onDrag({ self }) {
          setDragState({ type: 'over', closestEdge: extractClosestEdge(self.data) });
        },
        onDragLeave() {
          setDragState(idleState);
        },
        onDrop() {
          setDragState(idleState);
        },
      })
    );

    return combine(...cleanups);
  }, [allowedEdgesKey, canDrag, dragType, elementRef, id, instanceId]);

  return { dragState, shouldSuppressClick };
}
