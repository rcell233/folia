import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements, monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { useEffect, useRef, useState } from 'react';

import { View } from '@/application/types';

const SIDEBAR_PAGE_DRAG_TYPE = 'sidebar-page-tree';

export type SidebarDropIntent = 'before' | 'inside' | 'after';

interface SidebarDragData extends Record<string, unknown> {
  type: typeof SIDEBAR_PAGE_DRAG_TYPE;
  viewId: string;
}

interface SidebarDropData extends Record<string, unknown> {
  type: typeof SIDEBAR_PAGE_DRAG_TYPE;
  viewId: string;
  parentId: string;
  intent: SidebarDropIntent;
  acceptsInside: boolean;
}

export interface SidebarDropDestination {
  movedId: string;
  parentId: string;
  prevViewId: string | null | undefined;
  expandParentId?: string;
}

function findView(views: View[], viewId: string): View | undefined {
  for (const view of views) {
    if (view.view_id === viewId) return view;
    const child = findView(view.children || [], viewId);

    if (child) return child;
  }
}

function containsView(view: View | undefined, viewId: string): boolean {
  if (!view) return false;
  if (view.view_id === viewId) return true;
  return (view.children || []).some((child) => containsView(child, viewId));
}

export function resolveSidebarDrop(
  outline: View[],
  movedId: string,
  targetId: string,
  targetParentId: string,
  intent: SidebarDropIntent
): SidebarDropDestination | null {
  if (!movedId || movedId === targetId) return null;

  const movedView = findView(outline, movedId);

  if (!movedView || containsView(movedView, targetId)) return null;

  if (intent === 'inside') {
    const target = findView(outline, targetId);
    const lastChild = target?.children?.filter((child) => child.view_id !== movedId).slice(-1)[0];

    return { movedId, parentId: targetId, prevViewId: lastChild?.view_id, expandParentId: targetId };
  }

  const parent = findView(outline, targetParentId);
  const siblings = (parent?.children || []).filter((child) => child.view_id !== movedId);
  const targetIndex = siblings.findIndex((child) => child.view_id === targetId);

  if (targetIndex < 0) return null;

  const insertionIndex = intent === 'after' ? targetIndex + 1 : targetIndex;

  return {
    movedId,
    parentId: targetParentId,
    prevViewId: insertionIndex === 0 ? null : siblings[insertionIndex - 1]?.view_id,
  };
}

export function useSidebarDragMonitor({
  outline,
  onMove,
}: {
  outline: View[];
  onMove: (destination: SidebarDropDestination) => void;
}) {
  const outlineRef = useRef(outline);
  const onMoveRef = useRef(onMove);

  useEffect(() => {
    outlineRef.current = outline;
    onMoveRef.current = onMove;
  }, [onMove, outline]);

  useEffect(
    () =>
      monitorForElements({
        canMonitor: ({ source }) => source.data.type === SIDEBAR_PAGE_DRAG_TYPE,
        onDrop({ source, location }) {
          const target = location.current.dropTargets[0];

          if (!target) return;

          const sourceData = source.data as SidebarDragData;
          const targetData = target.data as unknown as SidebarDropData;
          const destination = resolveSidebarDrop(
            outlineRef.current,
            sourceData.viewId,
            targetData.viewId,
            targetData.parentId,
            targetData.intent
          );

          if (destination) onMoveRef.current(destination);
        },
      }),
    []
  );
}

export function useSidebarDragItem({
  elementRef,
  viewId,
  parentId,
  draggable: canDrag,
  acceptsInside = true,
  insideOnly = false,
  enabled = true,
}: {
  elementRef: React.RefObject<HTMLElement>;
  viewId: string;
  parentId: string;
  draggable: boolean;
  acceptsInside?: boolean;
  insideOnly?: boolean;
  enabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const [dropIntent, setDropIntent] = useState<SidebarDropIntent | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    const element = elementRef.current;

    if (!element || !enabled) return;

    const baseData = {
      type: SIDEBAR_PAGE_DRAG_TYPE,
      viewId,
      parentId,
    } as const;
    const cleanups = [
      dropTargetForElements({
        element,
        canDrop: ({ source }) => source.data.type === SIDEBAR_PAGE_DRAG_TYPE && source.data.viewId !== viewId,
        getIsSticky: () => true,
        getData({ input }) {
          const rect = element.getBoundingClientRect();
          const ratio = rect.height ? (input.clientY - rect.top) / rect.height : 0.5;
          const intent: SidebarDropIntent = insideOnly
            ? 'inside'
            : acceptsInside
            ? ratio < 0.25
              ? 'before'
              : ratio > 0.75
                ? 'after'
                : 'inside'
            : ratio < 0.5
              ? 'before'
              : 'after';

          return {
            type: baseData.type,
            viewId: baseData.viewId,
            parentId: baseData.parentId,
            acceptsInside,
            intent,
          } satisfies SidebarDropData;
        },
        onDrag({ self }) {
          setDropIntent((self.data as unknown as SidebarDropData).intent);
        },
        onDragLeave() {
          setDropIntent(null);
        },
        onDrop() {
          setDropIntent(null);
        },
      }),
    ];

    if (canDrag) {
      cleanups.push(
        draggable({
          element,
          getInitialData: () => ({ type: SIDEBAR_PAGE_DRAG_TYPE, viewId }) satisfies SidebarDragData,
          onDragStart() {
            suppressClickRef.current = true;
            setDragging(true);
          },
          onDrop() {
            window.setTimeout(() => {
              suppressClickRef.current = false;
            }, 0);
            setDragging(false);
          },
        })
      );
    }

    return combine(...cleanups);
  }, [acceptsInside, canDrag, elementRef, enabled, insideOnly, parentId, viewId]);

  return {
    dragging,
    dropIntent,
    shouldSuppressClick() {
      if (!suppressClickRef.current) return false;
      suppressClickRef.current = false;
      return true;
    },
  };
}
