import { isForceSaveShortcut } from '@/components/app/force-save';

describe('force-save shortcut', () => {
  it.each([
    { key: 's', ctrlKey: true, metaKey: false },
    { key: 'S', ctrlKey: false, metaKey: true },
  ])('accepts Ctrl/Cmd+S', ({ key, ctrlKey, metaKey }) => {
    expect(isForceSaveShortcut({ key, ctrlKey, metaKey, altKey: false, shiftKey: false })).toBe(true);
  });

  it.each([
    { key: 's', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false },
    { key: 's', ctrlKey: true, metaKey: false, altKey: false, shiftKey: true },
    { key: 's', ctrlKey: true, metaKey: false, altKey: true, shiftKey: false },
  ])('does not consume unrelated shortcuts', (event) => {
    expect(isForceSaveShortcut(event)).toBe(false);
  });
});
