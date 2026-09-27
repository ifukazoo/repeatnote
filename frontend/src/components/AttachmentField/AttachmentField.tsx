import type { ReactNode } from 'react';
import { getAttachmentUrl } from '../../api';
import { ATTACHMENT_KINDS } from '../../constants';
import type { AttachmentsEditor } from '../../hooks/useAttachmentsEditor';
import type { AttachmentKind } from '../../types';
import '../../shared.css';

// 種別ごとの表示（文言と、現在の添付の見せ方）
interface AttachmentUi {
  addLabel: string;
  replaceLabel: string;
  removeLabel: string;
  removedMessage: string;
  newFileLabel: string;
  currentClassName: string;
  renderCurrent: (filename: string) => ReactNode;
}

const ATTACHMENT_UI: Record<AttachmentKind, AttachmentUi> = {
  image: {
    addLabel: '📷 画像を追加 (任意・クリップボードからペースト可能)',
    replaceLabel: '📷 画像を変更 (任意・クリップボードからペースト可能)',
    removeLabel: '🗑️ 画像を削除',
    removedMessage: '画像が削除されます',
    newFileLabel: '新しい画像',
    currentClassName: 'current-image',
    renderCurrent: (filename) => (
      <img src={getAttachmentUrl(filename)} alt="現在の画像" className="edit-current-image" />
    ),
  },
  html: {
    addLabel: '🧩 HTML を添付 (任意・artifact として表示)',
    replaceLabel: '🧩 HTML を差し替え (任意・artifact として表示)',
    removeLabel: '🗑️ artifact を削除',
    removedMessage: 'artifact が削除されます',
    newFileLabel: '新しい HTML',
    currentClassName: 'current-artifact',
    renderCurrent: () => <span>🧩 artifact 添付済み</span>,
  },
};

interface AttachmentFieldProps {
  kind: AttachmentKind;
  editor: AttachmentsEditor;
  mode: 'add' | 'edit';
  // 編集フォームで、すでに添付されているファイル名
  currentFilename?: string;
}

// 添付1種別分の入力欄（現在の添付・削除と取り消し・ファイル選択・選択中のファイル）
export function AttachmentField({ kind, editor, mode, currentFilename }: AttachmentFieldProps) {
  const ui = ATTACHMENT_UI[kind];
  const draft = editor.drafts[kind];
  const inputId = `${mode}-${kind}-upload`;

  if (draft.removed) {
    return (
      <div className="image-removed">
        <span>{ui.removedMessage}</span>
        <button
          type="button"
          onClick={() => editor.setRemoved(kind, false)}
          className="undo-remove-btn"
        >
          ↶ 削除を取り消し
        </button>
      </div>
    );
  }

  return (
    <>
      {currentFilename && (
        <div className={ui.currentClassName}>
          {ui.renderCurrent(currentFilename)}
          <button
            type="button"
            onClick={() => editor.setRemoved(kind, true)}
            className="remove-current-image-btn"
          >
            {ui.removeLabel}
          </button>
        </div>
      )}

      <div className={mode === 'edit' ? 'edit-image-upload' : 'image-upload-container'}>
        <label htmlFor={inputId} className="image-upload-label">
          {currentFilename ? ui.replaceLabel : ui.addLabel}
        </label>
        <input
          type="file"
          id={inputId}
          ref={editor.inputRef(kind)}
          accept={ATTACHMENT_KINDS[kind].accept}
          onChange={editor.handleFileChange(kind)}
          className="image-upload-input"
        />
        {draft.file && (
          <div className="image-preview">
            {draft.previewUrl && (
              <img src={draft.previewUrl} alt="選択したファイル" className="preview-thumbnail" />
            )}
            <span>
              {mode === 'edit' ? ui.newFileLabel : '選択済み'}: {draft.file.name}
            </span>
            <button
              type="button"
              onClick={() => editor.clearFile(kind)}
              className="remove-image-btn"
              aria-label={`${ui.newFileLabel}の選択を取り消す`}
            >
              ❌
            </button>
          </div>
        )}
      </div>
    </>
  );
}
