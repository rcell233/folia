import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ViewLayout } from '@/application/types';
import ImportDialog from '@/components/app/import/ImportDialog';
import { populateDocumentWithMarkdown } from '@/components/app/import/import-service';

const addPage = jest.fn();
const openPageModal = jest.fn();

jest.mock('@/components/app/app.hooks', () => ({
  useAppHandlers: () => ({ addPage, openPageModal }),
  useCurrentWorkspaceId: () => 'workspace-1',
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('@/components/app/import/import-service', () => ({
  populateDocumentWithMarkdown: jest.fn(),
  stripFileExtension: (name: string) => name.replace(/\.[^.]+$/, ''),
}));

describe('ImportDialog Markdown import', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates and populates a child document before opening it', async () => {
    addPage.mockResolvedValue({ view_id: 'imported-view' });
    (populateDocumentWithMarkdown as jest.Mock).mockResolvedValue(undefined);
    const onOpenChange = jest.fn();

    render(
      <ImportDialog
        open
        parentViewId='parent-view'
        prevViewId='last-child'
        onOpenChange={onOpenChange}
      />
    );

    const input = screen.getByTestId('import-markdown-input');
    const file = new File(['# Heading'], 'notes.md', { type: 'text/markdown' });

    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);

    await waitFor(() => expect(openPageModal).toHaveBeenCalledWith('imported-view'));
    expect(addPage).toHaveBeenCalledWith('parent-view', {
      layout: ViewLayout.Document,
      name: 'notes',
      prev_view_id: 'last-child',
    });
    expect(populateDocumentWithMarkdown).toHaveBeenCalledWith('workspace-1', 'imported-view', file);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(addPage.mock.invocationCallOrder[0]).toBeLessThan(
      (populateDocumentWithMarkdown as jest.Mock).mock.invocationCallOrder[0]
    );
    expect((populateDocumentWithMarkdown as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
      openPageModal.mock.invocationCallOrder[0]
    );
  });

  it('accepts the same text formats as current AppFlowy Web', () => {
    render(<ImportDialog open parentViewId='parent-view' onOpenChange={jest.fn()} />);

    expect(screen.getByTestId('import-markdown-input').getAttribute('accept')).toBe(
      '.md,.markdown,.txt,text/markdown,text/plain'
    );
  });
});
