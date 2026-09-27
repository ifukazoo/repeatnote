import { useState, useRef, useEffect } from 'react';
import { ATTACHMENT_KINDS, validateAttachmentFile } from '../constants';
import type { AttachmentKind } from '../types';

interface UseFileAttachmentOptions {
  // 選択したファイルのプレビュー URL（オブジェクト URL）を作るか
  preview?: boolean;
}

export function useFileAttachment(
  kind: AttachmentKind,
  onError: (message: string) => void,
  { preview = false }: UseFileAttachmentOptions = {},
) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);

  // クリーンアップ：アンマウント時にプレビューURLを解放
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const selectFile = (selected: File) => {
    const error = validateAttachmentFile(kind, selected);
    if (error) {
      onError(error);
      return;
    }
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    setFile(selected);
    setPreviewUrl(preview ? URL.createObjectURL(selected) : null);
  };

  const clearFile = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) selectFile(selected);
  };

  // 種別に pasteMimePrefix がある場合のみ、クリップボードのファイルを受け付ける
  const handleClipboardPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const prefix = ATTACHMENT_KINDS[kind].pasteMimePrefix;
    const items = e.clipboardData?.items;
    if (!prefix || !items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith(prefix)) {
        e.preventDefault();
        const pasted = item.getAsFile();
        if (pasted) selectFile(pasted);
        break;
      }
    }
  };

  return {
    file,
    previewUrl,
    fileInputRef,
    handleFileChange,
    handleClipboardPaste,
    clearFile,
  };
}
