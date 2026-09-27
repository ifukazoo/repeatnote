import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileAttachment } from '../hooks/useFileAttachment';
import { ATTACHMENT_KINDS } from '../constants';

function changeEvent(file: File) {
  return { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
}

function pasteEvent(file: File) {
  const preventDefault = vi.fn();
  const event = {
    preventDefault,
    clipboardData: { items: [{ type: file.type, getAsFile: () => file }] },
  } as unknown as React.ClipboardEvent<HTMLTextAreaElement>;
  return { event, preventDefault };
}

// jsdom には createObjectURL / revokeObjectURL がないため、テスト用に差し込む
// （アンマウント時のクリーンアップはテスト後に走るので、元に戻さない）
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

describe('useFileAttachment', () => {
  it('正しいファイルを選ぶと保持し、preview 指定時はプレビュー URL を作る', () => {
    const { result } = renderHook(() => useFileAttachment('image', vi.fn(), { preview: true }));
    const file = new File(['x'], 'photo.jpg');

    act(() => result.current.handleFileChange(changeEvent(file)));

    expect(result.current.file).toBe(file);
    expect(result.current.previewUrl).toBe('blob:preview');
  });

  it('preview を指定しなければプレビュー URL を作らない', () => {
    const { result } = renderHook(() => useFileAttachment('html', vi.fn()));

    act(() => result.current.handleFileChange(changeEvent(new File(['x'], 'page.html'))));

    expect(result.current.previewUrl).toBeNull();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('許可されていない拡張子なら onError を呼び、ファイルを保持しない', () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useFileAttachment('html', onError));

    act(() => result.current.handleFileChange(changeEvent(new File(['x'], 'photo.jpg'))));

    expect(onError).toHaveBeenCalledWith(ATTACHMENT_KINDS.html.errorMessages.invalidType);
    expect(result.current.file).toBeNull();
  });

  it('画像はクリップボードからの貼り付けを受け付ける', () => {
    const { result } = renderHook(() => useFileAttachment('image', vi.fn(), { preview: true }));
    const file = new File(['x'], 'image.png', { type: 'image/png' });
    const { event, preventDefault } = pasteEvent(file);

    act(() => result.current.handleClipboardPaste(event));

    expect(preventDefault).toHaveBeenCalled();
    expect(result.current.file).toBe(file);
  });

  it('html は貼り付けを無視する（テキストの貼り付けを妨げない）', () => {
    const { result } = renderHook(() => useFileAttachment('html', vi.fn()));
    const { event, preventDefault } = pasteEvent(new File(['x'], 'image.png', { type: 'image/png' }));

    act(() => result.current.handleClipboardPaste(event));

    expect(preventDefault).not.toHaveBeenCalled();
    expect(result.current.file).toBeNull();
  });

  it('clearFile でプレビュー URL を解放し、input をリセットする', () => {
    const { result } = renderHook(() => useFileAttachment('image', vi.fn(), { preview: true }));
    const input = document.createElement('input');
    (result.current.fileInputRef as { current: HTMLInputElement }).current = input;
    act(() => result.current.handleFileChange(changeEvent(new File(['x'], 'photo.jpg'))));

    act(() => result.current.clearFile());

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
    expect(result.current.file).toBeNull();
    expect(result.current.previewUrl).toBeNull();
    expect(input.value).toBe('');
  });

  it('アンマウント時にプレビュー URL を解放する', () => {
    const { result, unmount } = renderHook(() =>
      useFileAttachment('image', vi.fn(), { preview: true }),
    );
    act(() => result.current.handleFileChange(changeEvent(new File(['x'], 'photo.jpg'))));

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });
});
