import { CircularProgress, Dialog, IconButton } from '@mui/material';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { ViewLayout } from '@/application/types';
import { ReactComponent as CloseIcon } from '@/assets/icons/close.svg';
import { ReactComponent as TextIcon } from '@/assets/icons/text.svg';
import { useAppHandlers, useCurrentWorkspaceId } from '@/components/app/app.hooks';
import { populateDocumentWithMarkdown, stripFileExtension } from '@/components/app/import/import-service';

const MARKDOWN_ACCEPT = '.md,.markdown,.txt,text/markdown,text/plain';

interface ImportDialogProps {
  open: boolean;
  parentViewId: string;
  prevViewId?: string;
  onOpenChange: (open: boolean) => void;
}

export default function ImportDialog({ open, parentViewId, prevViewId, onOpenChange }: ImportDialogProps) {
  const { t } = useTranslation();
  const workspaceId = useCurrentWorkspaceId();
  const { addPage, openPageModal } = useAppHandlers();
  const [importing, setImporting] = useState(false);
  const markdownInputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setImporting(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleMarkdown = useCallback(
    async (file: File) => {
      if (!workspaceId || !addPage) return;
      setImporting(true);
      try {
        const created = await addPage(parentViewId, {
          layout: ViewLayout.Document,
          name: stripFileExtension(file.name),
          prev_view_id: prevViewId,
        });

        await populateDocumentWithMarkdown(workspaceId, created.view_id, file);
        toast.success(t('importPanel.success'));
        close();
        void openPageModal?.(created.view_id);
        // eslint-disable-next-line
      } catch (error: any) {
        toast.error(error?.message ?? t('importPanel.failed'));
      } finally {
        setImporting(false);
      }
    },
    [addPage, close, openPageModal, parentViewId, prevViewId, t, workspaceId]
  );

  const onMarkdownPicked = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      event.target.value = '';
      if (file) void handleMarkdown(file);
    },
    [handleMarkdown]
  );

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!importing) onOpenChange(false);
      }}
      keepMounted={false}
      PaperProps={{
        'data-testid': 'import-dialog',
        className: 'w-[480px] max-w-[90vw] rounded-500',
      }}
    >
      <div className='relative flex flex-col gap-4 p-5'>
        <div className='flex w-full items-center justify-between text-base font-medium'>
          <span className='flex-1 truncate font-medium'>{t('importPanel.title')}</span>
          <IconButton
            size='small'
            color='inherit'
            className='-right-1.5 h-6 w-6'
            data-testid='import-dialog-close'
            title={t('button.close')}
            aria-label={t('button.close')}
            onClick={() => {
              if (!importing) onOpenChange(false);
            }}
            disabled={importing}
          >
            <CloseIcon />
          </IconButton>
        </div>

        <div className='grid grid-cols-2 gap-3'>
          <button
            type='button'
            disabled={importing}
            onClick={() => markdownInputRef.current?.click()}
            className='flex items-center gap-3 rounded-300 bg-fill-content px-4 py-3 text-left text-text-primary hover:bg-fill-content-hover disabled:opacity-60'
            data-testid='import-markdown'
          >
            <TextIcon className='h-5 w-5 text-icon-primary' />
            <span className='text-sm'>{t('importPanel.textAndMarkdown')}</span>
            {importing ? <CircularProgress size={14} className='ml-auto' /> : null}
          </button>
        </div>

        <input
          ref={markdownInputRef}
          type='file'
          accept={MARKDOWN_ACCEPT}
          className='hidden'
          data-testid='import-markdown-input'
          onChange={onMarkdownPicked}
        />
      </div>
    </Dialog>
  );
}
