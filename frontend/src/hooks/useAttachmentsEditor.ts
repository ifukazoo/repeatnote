import { useState, useRef, useEffect } from 'react';
import { ATTACHMENT_KINDS, ATTACHMENT_KIND_ORDER, validateAttachmentFile } from '../constants';
import type { AttachmentChanges, AttachmentKind } from '../types';

// フォーム上の添付1種別分の編集状態
export interface AttachmentDraft {
  file: File | null;
  previewUrl: string | null;
  // 既存の添付の削除を指示しているか（編集フォームのみ）
  removed: boolean;
}

type Drafts = Record<AttachmentKind, AttachmentDraft>;

const EMPTY_DRAFT: AttachmentDraft = { file: null, previewUrl: null, removed: false };

function emptyDrafts(): Drafts {
  return Object.fromEntries(ATTACHMENT_KIND_ORDER.map((kind) => [kind, EMPTY_DRAFT])) as Drafts;
}

// 全種別の添付の選択・取り消し・削除指示をまとめて管理する。
// 種別ごとの違い（拡張子・上限・プレビュー・貼り付け）は ATTACHMENT_KINDS から引く
export function useAttachmentsEditor(onError: (message: string) => void) {
  const [drafts, setDrafts] = useState<Drafts>(emptyDrafts);
  // 同じイベント内で続けて更新しても最新の状態を参照できるよう、ref を正とする（更新は setDraft 経由のみ）
  const draftsRef = useRef(drafts);
  const inputRefs = useRef<Partial<Record<AttachmentKind, HTMLInputElement | null>>>({});

  // クリーンアップ：アンマウント時にプレビューURLを解放
  useEffect(() => {
    return () => {
      for (const kind of ATTACHMENT_KIND_ORDER) {
        const url = draftsRef.current[kind].previewUrl;
        if (url) URL.revokeObjectURL(url);
      }
    };
  }, []);

  const setDraft = (kind: AttachmentKind, draft: AttachmentDraft) => {
    const url = draftsRef.current[kind].previewUrl;
    if (url && url !== draft.previewUrl) URL.revokeObjectURL(url);
    draftsRef.current = { ...draftsRef.current, [kind]: draft };
    setDrafts(draftsRef.current);
  };

  const resetInput = (kind: AttachmentKind) => {
    const input = inputRefs.current[kind];
    if (input) input.value = '';
  };

  // 新しいファイルを選ぶと削除の指示は取り消す
  const selectFile = (kind: AttachmentKind, file: File) => {
    const error = validateAttachmentFile(kind, file);
    if (error) {
      onError(error);
      return;
    }
    const previewUrl = ATTACHMENT_KINDS[kind].preview ? URL.createObjectURL(file) : null;
    setDraft(kind, { file, previewUrl, removed: false });
  };

  const clearFile = (kind: AttachmentKind) => {
    setDraft(kind, { ...draftsRef.current[kind], file: null, previewUrl: null });
    resetInput(kind);
  };

  const setRemoved = (kind: AttachmentKind, removed: boolean) => {
    setDraft(kind, { file: null, previewUrl: null, removed });
    resetInput(kind);
  };

  const reset = () => {
    for (const kind of ATTACHMENT_KIND_ORDER) {
      setDraft(kind, EMPTY_DRAFT);
      resetInput(kind);
    }
  };

  const handleFileChange = (kind: AttachmentKind) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) selectFile(kind, file);
  };

  // 貼り付けられたファイルを、pasteMimePrefix が一致する種別に振り分ける
  const handleClipboardPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const kind = ATTACHMENT_KIND_ORDER.find((k) => {
        const prefix = ATTACHMENT_KINDS[k].pasteMimePrefix;
        return prefix && item.type.startsWith(prefix);
      });
      if (!kind) continue;
      e.preventDefault();
      const file = item.getAsFile();
      if (file) selectFile(kind, file);
      break;
    }
  };

  const inputRef = (kind: AttachmentKind) => (el: HTMLInputElement | null) => {
    inputRefs.current[kind] = el;
  };

  // 新規作成で送るファイル
  const files = (): Partial<Record<AttachmentKind, File>> => {
    const result: Partial<Record<AttachmentKind, File>> = {};
    for (const kind of ATTACHMENT_KIND_ORDER) {
      const file = drafts[kind].file;
      if (file) result[kind] = file;
    }
    return result;
  };

  // 編集で送る添付の変更
  const changes = (): AttachmentChanges => {
    const result: AttachmentChanges = {};
    for (const kind of ATTACHMENT_KIND_ORDER) {
      const { file, removed } = drafts[kind];
      if (file) result[kind] = { file };
      else if (removed) result[kind] = { remove: true };
    }
    return result;
  };

  return {
    drafts,
    selectFile,
    clearFile,
    setRemoved,
    reset,
    handleFileChange,
    handleClipboardPaste,
    inputRef,
    files,
    changes,
  };
}

export type AttachmentsEditor = ReturnType<typeof useAttachmentsEditor>;
