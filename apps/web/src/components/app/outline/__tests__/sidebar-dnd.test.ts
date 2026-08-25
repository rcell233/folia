import { View } from '@/application/types';
import { resolveSidebarDrop } from '@/components/app/outline/sidebar-dnd';

function view(viewId: string, children: View[] = []): View {
  return { view_id: viewId, children } as View;
}

describe('resolveSidebarDrop', () => {
  const outline = [
    view('space-a', [view('a'), view('b', [view('b-child')]), view('c')]),
    view('space-b', [view('d')]),
  ];

  it('reorders a page before a sibling', () => {
    expect(resolveSidebarDrop(outline, 'c', 'a', 'space-a', 'before')).toEqual({
      movedId: 'c',
      parentId: 'space-a',
      prevViewId: null,
    });
  });

  it('moves a page into any other page', () => {
    expect(resolveSidebarDrop(outline, 'a', 'b', 'space-a', 'inside')).toEqual({
      movedId: 'a',
      parentId: 'b',
      prevViewId: 'b-child',
      expandParentId: 'b',
    });
  });

  it('moves a page across spaces', () => {
    expect(resolveSidebarDrop(outline, 'a', 'space-b', '', 'inside')).toEqual({
      movedId: 'a',
      parentId: 'space-b',
      prevViewId: 'd',
      expandParentId: 'space-b',
    });
  });

  it('prevents moving a page into its own descendant', () => {
    expect(resolveSidebarDrop(outline, 'b', 'b-child', 'b', 'inside')).toBeNull();
  });
});
