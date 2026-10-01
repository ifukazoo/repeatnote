import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AttachmentField } from '../components/AttachmentField/AttachmentField';
import { useAttachmentsEditor } from '../hooks/useAttachmentsEditor';
import { ATTACHMENT_KINDS, MULTIPLE_FILES_ERROR } from '../constants';
import type { AttachmentKind } from '../types';

// jsdom には createObjectURL / revokeObjectURL がないため、画像のプレビュー用に差し込む
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

// jsdom には DataTransfer がないため、fireEvent に渡すプロパティとして作る
function fileTransfer(files: File[]) {
  return { types: ['Files'], files, dropEffect: 'none' };
}

function textTransfer() {
  return { types: ['text/plain'], files: [], dropEffect: 'none' };
}

function Field({ kind, onError }: { kind: AttachmentKind; onError: (m: string) => void }) {
  const editor = useAttachmentsEditor(onError);
  return <AttachmentField kind={kind} editor={editor} mode="add" />;
}

function renderField(kind: AttachmentKind = 'html') {
  const onError = vi.fn();
  render(<Field kind={kind} onError={onError} />);
  const label = screen.getByText(kind === 'html' ? /HTML を添付/ : /画像を追加/);
  const target = label.closest('.attachment-drop-target') as HTMLElement;
  return { onError, target, label };
}

describe('AttachmentField のドラッグ&ドロップ', () => {
  it('ラベルに「ドラッグ&ドロップ可」を表示する', () => {
    renderField('image');
    expect(screen.getByText(/ドラッグ&ドロップ可/)).toBeInTheDocument();
  });

  it('ファイルをドラッグすると強調し、離れると解除する', () => {
    const { target } = renderField();

    fireEvent.dragEnter(target, { dataTransfer: fileTransfer([]) });
    expect(target).toHaveClass('is-dragging');

    fireEvent.dragLeave(target, { dataTransfer: fileTransfer([]) });
    expect(target).not.toHaveClass('is-dragging');
  });

  it('子要素をまたいでも強調を解除しない', () => {
    const { target, label } = renderField();

    fireEvent.dragEnter(target, { dataTransfer: fileTransfer([]) });
    fireEvent.dragEnter(label, { dataTransfer: fileTransfer([]) });
    fireEvent.dragLeave(label, { dataTransfer: fileTransfer([]) });

    expect(target).toHaveClass('is-dragging');

    // 枠から出たら、子要素をまたいだ後でも強調が消える（数え方がずれて残らない）
    fireEvent.dragLeave(target, { dataTransfer: fileTransfer([]) });
    expect(target).not.toHaveClass('is-dragging');
  });

  it('ファイルの dragover では既定の動作を止め、dropEffect を copy にする', () => {
    const { target } = renderField();
    const dataTransfer = fileTransfer([]);

    const notPrevented = fireEvent.dragOver(target, { dataTransfer });

    expect(notPrevented).toBe(false);
    expect(dataTransfer.dropEffect).toBe('copy');
  });

  it('子要素をまたいだ後にドロップすると、選択して強調を解除する', () => {
    const { target, label, onError } = renderField();
    const file = new File(['<p>x</p>'], 'page.html');

    fireEvent.dragEnter(target, { dataTransfer: fileTransfer([file]) });
    fireEvent.dragEnter(label, { dataTransfer: fileTransfer([file]) });
    fireEvent.drop(label, { dataTransfer: fileTransfer([file]) });

    expect(target).not.toHaveClass('is-dragging');
    expect(screen.getByText('選択済み: page.html')).toBeInTheDocument();
    expect(onError).not.toHaveBeenCalled();
  });

  it('画像欄に画像をドロップすると選択する', () => {
    const { target } = renderField('image');

    fireEvent.drop(target, { dataTransfer: fileTransfer([new File(['x'], 'photo.png')]) });

    expect(screen.getByText('選択済み: photo.png')).toBeInTheDocument();
  });

  it('種類の違うファイルをドロップするとエラーを出す', () => {
    const { target, onError } = renderField('html');

    fireEvent.drop(target, { dataTransfer: fileTransfer([new File(['x'], 'photo.png')]) });

    expect(onError).toHaveBeenCalledWith(ATTACHMENT_KINDS.html.errorMessages.invalidType);
  });

  it('複数のファイルをドロップするとエラーを出し、何も選択しない', () => {
    const { target, onError } = renderField('html');

    fireEvent.drop(target, {
      dataTransfer: fileTransfer([new File(['x'], 'a.html'), new File(['x'], 'b.html')]),
    });

    expect(onError).toHaveBeenCalledWith(MULTIPLE_FILES_ERROR);
    expect(screen.queryByText(/選択済み/)).not.toBeInTheDocument();
  });

  it('ファイルが0個のドロップでは何もせず、強調だけ解除する', () => {
    const { target, onError } = renderField();

    fireEvent.dragEnter(target, { dataTransfer: fileTransfer([]) });
    fireEvent.drop(target, { dataTransfer: fileTransfer([]) });

    expect(target).not.toHaveClass('is-dragging');
    expect(onError).not.toHaveBeenCalled();
  });

  it('ファイル以外のドラッグには反応しない', () => {
    const { target } = renderField();

    fireEvent.dragEnter(target, { dataTransfer: textTransfer() });
    const notPrevented = fireEvent.dragOver(target, { dataTransfer: textTransfer() });

    expect(target).not.toHaveClass('is-dragging');
    expect(notPrevented).toBe(true);
  });
});
