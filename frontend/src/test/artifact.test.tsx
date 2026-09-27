import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArtifactModal } from '../components/ArtifactModal/ArtifactModal';
import { ItemDisplay } from '../components/ItemDisplay/ItemDisplay';
import { EditForm } from '../components/EditForm/EditForm';
import type { Item } from '../types';

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({ ok: true, text: async () => '<title>クイズ</title><p>x</p>' });
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ArtifactModal', () => {
  it('filename が null のときは何も表示しない', () => {
    const { container } = render(<ArtifactModal filename={null} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('sandbox iframe で表示し、allow-same-origin を付けない', () => {
    render(<ArtifactModal filename="page.html" onClose={vi.fn()} />);

    const iframe = document.querySelector('iframe')!;
    expect(iframe.getAttribute('src')).toBe('/api/attachments/page.html');
    const sandbox = iframe.getAttribute('sandbox') ?? '';
    expect(sandbox).toContain('allow-scripts');
    expect(sandbox).not.toContain('allow-same-origin');
  });

  it('HTML の <title> をヘッダーに表示する', async () => {
    render(<ArtifactModal filename="page.html" onClose={vi.fn()} />);

    expect(await screen.findByText('🧩 クイズ')).toBeInTheDocument();
  });

  it('<title> がなければ既定の文言を表示する', async () => {
    mockFetch.mockResolvedValue({ ok: true, text: async () => '<p>x</p>' });
    render(<ArtifactModal filename="page.html" onClose={vi.fn()} />);

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(screen.getByText('🧩 artifact')).toBeInTheDocument();
  });

  it('× ボタンで閉じる', async () => {
    const onClose = vi.fn();
    render(<ArtifactModal filename="page.html" onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: '閉じる' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('ESC で閉じる', () => {
    const onClose = vi.fn();
    render(<ArtifactModal filename="page.html" onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('背景をクリックしても閉じない', () => {
    const onClose = vi.fn();
    render(<ArtifactModal filename="page.html" onClose={onClose} />);

    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('閉じたらタイトルの取得を中断する', () => {
    const { rerender } = render(<ArtifactModal filename="page.html" onClose={vi.fn()} />);
    const signal = mockFetch.mock.calls[0][1].signal as AbortSignal;

    rerender(<ArtifactModal filename={null} onClose={vi.fn()} />);
    expect(signal.aborted).toBe(true);
  });
});

describe('ItemDisplay の artifact ボタン', () => {
  const baseItem: Item = {
    id: 'uuid-1',
    content: '本文',
    attachments: {},
    created_at: '2026-01-01T00:00:00.000Z',
    next_review: '2026-01-02',
    interval_days: 1,
    ease_factor: 2.5,
    review_count: 0,
    mastered: false,
  };

  function renderDisplay(item: Item, onArtifactOpen = vi.fn()) {
    render(
      <ItemDisplay
        item={item}
        isCopied={false}
        isDropdownOpen={false}
        onDropdownToggle={vi.fn()}
        onEditStart={vi.fn()}
        onDelete={vi.fn()}
        onCopy={vi.fn()}
        onImageClick={vi.fn()}
        onArtifactOpen={onArtifactOpen}
      />,
    );
    return onArtifactOpen;
  }

  it('artifact がなければボタンを表示しない', () => {
    renderDisplay(baseItem);
    expect(screen.queryByRole('button', { name: /artifact を開く/ })).not.toBeInTheDocument();
  });

  it('artifact があればボタンを表示し、押すとファイル名を渡す', async () => {
    const onOpen = renderDisplay({ ...baseItem, attachments: { html: 'page.html' } });

    await userEvent.click(screen.getByRole('button', { name: /artifact を開く/ }));
    expect(onOpen).toHaveBeenCalledWith('page.html');
  });

  it('一覧では iframe を起動しない', () => {
    renderDisplay({ ...baseItem, attachments: { html: 'page.html' } });
    expect(document.querySelector('iframe')).toBeNull();
  });
});

describe('EditForm の artifact 操作', () => {
  function renderEdit(onSave = vi.fn().mockResolvedValue(undefined)) {
    render(
      <EditForm
        initialContent="本文"
        currentAttachments={{ html: 'page.html' }}
        onSave={onSave}
        onCancel={vi.fn()}
        onError={vi.fn()}
      />,
    );
    return onSave;
  }

  it('変更しなければ添付の変更を送らない', async () => {
    const onSave = renderEdit();

    await userEvent.click(screen.getByRole('button', { name: /保存/ }));
    expect(onSave).toHaveBeenCalledWith('本文', {});
  });

  it('削除すると html の削除を送る', async () => {
    const onSave = renderEdit();

    await userEvent.click(screen.getByRole('button', { name: /artifact を削除/ }));
    expect(screen.getByText('artifact が削除されます')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /保存/ }));

    expect(onSave).toHaveBeenCalledWith('本文', { html: { file: undefined, remove: true } });
  });

  it('差し替えると新しい HTML を送る', async () => {
    const onSave = renderEdit();
    const file = new File(['<p>new</p>'], 'new.htm', { type: '' });

    await userEvent.upload(screen.getByLabelText(/HTML を差し替え/), file);
    await userEvent.click(screen.getByRole('button', { name: /保存/ }));

    expect(onSave).toHaveBeenCalledWith('本文', { html: { file, remove: false } });
  });
});
