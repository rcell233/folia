import React, { useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { View, ViewIconType } from '@/application/types';
import {
  getFirstChildView,
  isDatabaseContainer,
  isDatabaseLayout,
  isReferencedDatabaseView as isRefDbView,
} from '@/application/view-utils';
import { CustomIconPopover } from '@/components/_shared/cutsom-icon';
import OutlineIcon from '@/components/_shared/outline/OutlineIcon';
import PageIcon from '@/components/_shared/view-icon/PageIcon';
import { useAppHandlers, useSidebarSelectedViewId } from '@/components/app/app.hooks';
import { useSidebarDragItem } from '@/components/app/outline/sidebar-dnd';

function ViewItem({
  view,
  width,
  level = 0,
  renderExtra,
  expandIds,
  toggleExpand,
  onClickView,
  parentView,
  parentId,
}: {
  view: View;
  width: number;
  level?: number;
  renderExtra?: ({ hovered, view }: { hovered: boolean; view: View }) => React.ReactNode;
  expandIds: string[];
  toggleExpand: (id: string, isExpand: boolean) => void;
  onClickView?: (viewId: string) => void;
  parentView?: View;
  parentId?: string;
}) {
  const { t } = useTranslation();
  const selectedViewId = useSidebarSelectedViewId();
  const viewId = view.view_id;
  const selected =
    selectedViewId === viewId ||
    (isDatabaseContainer(view) && Boolean(view.children?.some((child) => child.view_id === selectedViewId)));
  const { updatePage, uploadFile } = useAppHandlers();

  const isExpanded = expandIds.includes(viewId);
  const [hovered, setHovered] = React.useState<boolean>(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const { dragging, dropIntent, shouldSuppressClick } = useSidebarDragItem({
    elementRef: rowRef,
    viewId,
    parentId: parentId || '',
    draggable: parentId !== undefined,
    enabled: parentId !== undefined,
  });

  const handleChangeIcon = useCallback(
    async (icon: { ty: ViewIconType; value: string }) => {
      try {
        await updatePage?.(view.view_id, {
          icon: icon,
          name: view.name,
          extra: view.extra || {},
        });

        // eslint-disable-next-line
      } catch (e: any) {
        toast.error(e);
      }
    },
    [updatePage, view.extra, view.name, view.view_id]
  );

  const handleRemoveIcon = useCallback(() => {
    void handleChangeIcon({ ty: 0, value: '' });
  }, [handleChangeIcon]);

  const getIcon = useCallback(() => {
    return (
      <span className={'flex h-full w-5 items-center justify-end text-sm'}>
        <OutlineIcon
          level={level}
          isExpanded={isExpanded}
          setIsExpanded={(status) => {
            toggleExpand(viewId, status);
          }}
        />
      </span>
    );
  }, [isExpanded, level, toggleExpand, viewId]);

  // Dot icon for referenced database views (like desktop)
  const getDotIcon = useCallback(() => {
    return (
      <span className={'flex h-full w-5 items-center justify-end'}>
        <span className={'p-1.5'}>
          <span className={'block h-1 w-1 rounded-full bg-text-secondary'} />
        </span>
      </span>
    );
  }, []);

  const onUploadFile = useCallback(
    async (file: File) => {
      if (!uploadFile) return Promise.reject();
      return uploadFile(viewId, file);
    },
    [uploadFile, viewId]
  );

  const renderItem = useMemo(() => {
    if (!view) return null;

    // Determine which left icon to show
    // Use the utility function which properly handles database containers
    const isRefDatabaseView = isRefDbView(view, parentView);
    const hasChildren = Boolean(view.children?.length);

    // Calculate left padding based on icon presence
    const showLeftIcon = isRefDatabaseView || hasChildren;
    const leftPadding = showLeftIcon ? level * 16 : level * 16 + 24;

    // Render left icon: dot for referenced database views, expand icon for views with children
    const renderLeftIcon = () => {
      if (isRefDatabaseView) {
        return getDotIcon();
      }

      if (hasChildren) {
        return getIcon();
      }

      return null;
    };

    return (
      <div
        ref={rowRef}
        data-testid={`page-${view.view_id}`}
        data-selected={selected}
        style={{
          backgroundColor: selected ? 'var(--fill-content-hover)' : undefined,
          cursor: 'pointer',
          paddingLeft: leftPadding + 'px',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false);
        }}
        onClick={() => {
          if (shouldSuppressClick()) return;
          const firstChild = getFirstChildView(view);

          onClickView?.(firstChild?.view_id ?? viewId);
        }}
        className={`relative my-[1px] flex min-h-[30px] w-full cursor-pointer select-none items-center gap-1 overflow-hidden rounded-[8px] px-0.5 py-0.5 text-sm hover:bg-fill-content-hover focus:outline-none ${dragging ? 'opacity-40' : ''} ${dropIntent === 'inside' ? 'bg-content-blue-50' : ''}`}
      >
        {dropIntent === 'before' && <div className='absolute inset-x-1 top-0 h-0.5 bg-content-blue-400' />}
        {dropIntent === 'after' && <div className='absolute inset-x-1 bottom-0 h-0.5 bg-content-blue-400' />}
        {renderLeftIcon()}

        <CustomIconPopover
          defaultActiveTab={view.icon?.ty === 1 ? 'upload' : view.icon?.ty === 2 ? 'icon' : 'emoji'}
          tabs={['emoji', 'icon', 'upload']}
          onUploadFile={onUploadFile}
          onSelectIcon={(icon) => {
            if (icon.ty === ViewIconType.Icon) {
              void handleChangeIcon({
                ty: ViewIconType.Icon,
                value: JSON.stringify({
                  color: icon.color,
                  groupName: icon.value.split('/')[0],
                  iconName: icon.value.split('/')[1],
                }),
              });
              return;
            }

            void handleChangeIcon(icon);
          }}
          removeIcon={handleRemoveIcon}
        >
          <div
            data-testid='page-icon'
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <PageIcon
              view={view}
              className={'mr-1 flex h-5 w-5 items-center justify-center text-base text-text-secondary'}
            />
          </div>
        </CustomIconPopover>

        <div className={'flex flex-1 items-center gap-1 overflow-hidden text-sm'}>
          <div data-testid='page-name' className={'w-full truncate'}>
            {view.name.trim() || t('menuAppHeader.defaultNewPageName')}
          </div>
        </div>
        {renderExtra && renderExtra({ hovered, view })}
      </div>
    );
  }, [
    view,
    selected,
    level,
    getIcon,
    getDotIcon,
    parentView,
    onUploadFile,
    handleRemoveIcon,
    t,
    renderExtra,
    hovered,
    onClickView,
    viewId,
    handleChangeIcon,
    dragging,
    dropIntent,
    shouldSuppressClick,
  ]);

  const renderChildren = useMemo(() => {
    // Don't pass renderExtra (more button) to children when parent is a database layout
    // or when parent is a database container
    const parentIsDatabaseLayout = isDatabaseLayout(view.layout);
    const parentIsContainer = isDatabaseContainer(view);
    const childRenderExtra = parentIsDatabaseLayout || parentIsContainer ? undefined : renderExtra;

    return (
      <div
        className={'flex w-full transform flex-col overflow-hidden transition-all'}
        style={{
          display: isExpanded ? 'block' : 'none',
        }}
      >
        {view?.children?.map((child) => (
          <ViewItem
            level={level + 1}
            key={child.view_id}
            view={child}
            width={width}
            renderExtra={childRenderExtra}
            expandIds={expandIds}
            toggleExpand={toggleExpand}
            onClickView={onClickView}
            parentView={view}
            parentId={viewId}
          />
        ))}
      </div>
    );
  }, [toggleExpand, onClickView, isExpanded, expandIds, level, renderExtra, view, viewId, width]);

  return (
    <div
      style={{
        width,
      }}
      className={'flex h-fit flex-col overflow-hidden'}
      data-testid='page-item'
    >
      {renderItem}
      {renderChildren}
    </div>
  );
}

export default ViewItem;
