import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAttachmentsEditor } from '../hooks/useAttachmentsEditor';
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

describe('useAttachmentsEditor', () => {
  it('プレビューを持つ種別（画像）はファイルを選ぶとプレビュー URL を作る', () => {
    const { result } = renderHook(() => useAttachmentsEditor(vi.fn()));
    const file = new File(['x'], 'photo.jpg');

    act(() => result.current.handleFileChange('image')(changeEvent(file)));

    expect(result.current.drafts.image.file).toBe(file);
    expect(result.current.drafts.image.previewUrl).toBe('blob:preview');
  });

  it('プレビューを持たない種別（html）はプレビュー URL を作らない', () => {
    const { result } = renderHook(() => useAttachmentsEditor(vi.fn()));

    act(() => result.current.handleFileChange('html')(changeEvent(new File(['x'], 'page.html'))));

    expect(result.current.drafts.html.previewUrl).toBeNull();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('許可されていない拡張子なら onError を呼び、ファイルを保持しない', () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useAttachmentsEditor(onError));

    act(() => result.current.handleFileChange('html')(changeEvent(new File(['x'], 'photo.jpg'))));

    expect(onError).toHaveBeenCalledWith(ATTACHMENT_KINDS.html.errorMessages.invalidType);
    expect(result.current.drafts.html.file).toBeNull();
  });

  it('貼り付けた画像を image に振り分ける', () => {
    const { result } = renderHook(() => useAttachmentsEditor(vi.fn()));
    const file = new File(['x'], 'image.png', { type: 'image/png' });
    const { event, preventDefault } = pasteEvent(file);

    act(() => result.current.handleClipboardPaste(event));

    expect(preventDefault).toHaveBeenCalled();
    expect(result.current.drafts.image.file).toBe(file);
    expect(result.current.drafts.html.file).toBeNull();
  });

  it('どの種別にも該当しない貼り付けは妨げない', () => {
    const { result } = renderHook(() => useAttachmentsEditor(vi.fn()));
    const { event, preventDefault } = pasteEvent(new File(['x'], 'a.txt', { type: 'text/plain' }));

    act(() => result.current.handleClipboardPaste(event));

    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('clearFile でプレビュー URL を解放し、input をリセットする', () => {
    const { result } = renderHook(() => useAttachmentsEditor(vi.fn()));
    const input = document.createElement('input');
    result.current.inputRef('image')(input);
    act(() => result.current.handleFileChange('image')(changeEvent(new File(['x'], 'photo.jpg'))));

    act(() => result.current.clearFile('image'));

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
    expect(result.current.drafts.image.file).toBeNull();
    expect(input.value).toBe('');
  });

  it('削除を指示すると選択中のファイルを捨て、新しいファイルを選ぶと削除の指示を取り消す', () => {
    const { result } = renderHook(() => useAttachmentsEditor(vi.fn()));
    const file = new File(['x'], 'photo.jpg');

    act(() => result.current.handleFileChange('image')(changeEvent(file)));
    act(() => result.current.setRemoved('image', true));
    expect(result.current.drafts.image).toEqual({ file: null, previewUrl: null, removed: true });

    act(() => result.current.handleFileChange('image')(changeEvent(file)));
    expect(result.current.drafts.image.removed).toBe(false);
  });

  it('files と changes で送信用の形に変換する', () => {
    const { result } = renderHook(() => useAttachmentsEditor(vi.fn()));
    const image = new File(['x'], 'photo.jpg');

    act(() => result.current.handleFileChange('image')(changeEvent(image)));
    act(() => result.current.setRemoved('html', true));

    expect(result.current.files()).toEqual({ image });
    expect(result.current.changes()).toEqual({ image: { file: image }, html: { remove: true } });
  });

  it('reset ですべての種別を空に戻す', () => {
    const { result } = renderHook(() => useAttachmentsEditor(vi.fn()));

    act(() => result.current.handleFileChange('image')(changeEvent(new File(['x'], 'a.jpg'))));
    act(() => result.current.handleFileChange('html')(changeEvent(new File(['x'], 'a.html'))));
    act(() => result.current.reset());

    expect(result.current.files()).toEqual({});
    expect(result.current.changes()).toEqual({});
  });

  it('アンマウント時にプレビュー URL を解放する', () => {
    const { result, unmount } = renderHook(() => useAttachmentsEditor(vi.fn()));
    act(() => result.current.handleFileChange('image')(changeEvent(new File(['x'], 'photo.jpg'))));

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });
});
