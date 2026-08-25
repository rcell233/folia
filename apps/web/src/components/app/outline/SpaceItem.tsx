import { Tooltip } from '@mui/material';
import React, { useMemo, useRef } from 'react';

import { View } from '@/application/types';
import { ReactComponent as PrivateIcon } from '@/assets/icons/lock.svg';
import SpaceIcon from '@/components/_shared/view-icon/SpaceIcon';
import { useSidebarDragItem, useSidebarDropIntent } from '@/components/app/outline/sidebar-dnd';
import ViewItem from '@/components/app/outline/ViewItem';

function SpaceItem({
  view,
  width,
  renderExtra,
  expandIds,
  toggleExpand,
  onClickView,
  onClickSpace,
  parentId,
}: {
  view: View;
  width: number;
  expandIds: string[];
  toggleExpand: (id: string, isExpand: boolean) => void;
  renderExtra?: ({ hovered, view }: { hovered: boolean; view: View }) => React.ReactNode;
  onClickView?: (viewId: string) => void;
  onClickSpace?: (viewId: string) => void;
  parentId?: string;
}) {
  const [hovered, setHovered] = React.useState<boolean>(false);
  const isExpanded = expandIds.includes(view.view_id);
  const isPrivate = view.is_private;
  const rowRef = useRef<HTMLDivElement>(null);

  useSidebarDragItem({
    elementRef: rowRef,
    viewId: view.view_id,
    parentId: parentId || '',
    draggable: false,
    insideOnly: true,
    enabled: parentId !== undefined,
  });
  const dropIntent = useSidebarDropIntent(view.view_id);
  const renderItem = useMemo(() => {
    if (!view) return null;
    const extra = view?.extra;
    const name = view?.name || '';

    return (
      <div
        ref={rowRef}
        data-testid={`space-${view.view_id}`}
        data-expanded={isExpanded}
        style={{
          width,
        }}
        onClick={() => {
          toggleExpand(view.view_id, !isExpanded);
          onClickSpace?.(view.view_id);
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`relative flex min-h-[30px] w-full cursor-pointer select-none items-center gap-0.5 truncate rounded-[8px] px-1 py-0.5 text-sm hover:bg-fill-content-hover focus:bg-fill-content-hover focus:outline-none ${dropIntent === 'inside' ? 'bg-content-blue-50' : ''}`}
      >
        {dropIntent === 'before' && <div className='absolute inset-x-1 top-0 h-0.5 bg-content-blue-400' />}
        {dropIntent === 'after' && <div className='absolute inset-x-1 bottom-0 h-0.5 bg-content-blue-400' />}
        <SpaceIcon
          className={'icon mr-1.5 !h-5 !w-5 !min-w-5'}
          bgColor={extra?.space_icon_color}
          value={extra?.space_icon || ''}
          char={extra?.space_icon ? undefined : name.slice(0, 1)}
        />
        <Tooltip title={name} disableInteractive={true}>
          <div className={'flex flex-1 items-center justify-start gap-1 overflow-hidden text-sm'}>
            <div data-testid="space-name" className={'truncate font-medium'}>{name}</div>

            {isPrivate && (
              <div className={'min-h-5 min-w-5 text-base text-text-primary opacity-80'}>
                <PrivateIcon className='h-5 w-5' />
              </div>
            )}
          </div>
        </Tooltip>
        {renderExtra && renderExtra({ hovered, view })}
      </div>
    );
  }, [dropIntent, hovered, isExpanded, isPrivate, onClickSpace, renderExtra, toggleExpand, view, width]);

  const renderChildren = useMemo(() => {
    return (
      <div
        className={'flex transform flex-col gap-2 transition-all'}
        style={{
          display: isExpanded ? 'block' : 'none',
        }}
      >
        {view?.children?.map((child) => (
          <ViewItem
            key={child.view_id}
            view={child}
            width={width}
            renderExtra={renderExtra}
            expandIds={expandIds}
            toggleExpand={toggleExpand}
            onClickView={onClickView}
            parentId={view.view_id}
          />
        ))}
      </div>
    );
  }, [onClickView, isExpanded, view, width, renderExtra, expandIds, toggleExpand]);

  return (
    <div className={'flex h-fit w-full flex-col'} data-testid='space-item'>
      <div data-testid='space-expanded' data-expanded={isExpanded} style={{ display: 'none' }} />
      {renderItem}
      {renderChildren}
    </div>
  );
}

export default SpaceItem;
