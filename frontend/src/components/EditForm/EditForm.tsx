import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAttachmentsEditor } from '../../hooks/useAttachmentsEditor';
import { ATTACHMENT_KIND_ORDER } from '../../constants';
import { AttachmentField } from '../AttachmentField/AttachmentField';
import type { AttachmentChanges, Attachments } from '../../types';
import './EditForm.css';
import '../../shared.css';

interface EditFormProps {
  initialContent: string;
  currentAttachments: Attachments;
  onSave: (content: string, changes: AttachmentChanges) => Promise<void>;
  onCancel: () => void;
  onError: (message: string) => void;
}

export function EditForm({
  initialContent,
  currentAttachments,
  onSave,
  onCancel,
  onError,
}: EditFormProps) {
  const [editContent, setEditContent] = useState(initialContent);
  const [previewMode, setPreviewMode] = useState<'write' | 'preview'>('write');
  const attachments = useAttachmentsEditor(onError);

  const handleSave = async () => {
    if (!editContent.trim()) return;
    if (editContent.length > 1000) return;
    await onSave(editContent.trim(), attachments.changes());
  };

  return (
    <div className="edit-form">
      <div className="edit-tabs">
        <button
          type="button"
          className={`edit-tab ${previewMode === 'write' ? 'active' : ''}`}
          onClick={() => setPreviewMode('write')}
        >
          編集
        </button>
        <button
          type="button"
          className={`edit-tab ${previewMode === 'preview' ? 'active' : ''}`}
          onClick={() => setPreviewMode('preview')}
        >
          プレビュー
        </button>
      </div>

      {previewMode === 'write' ? (
        <div className="input-wrapper">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onPaste={attachments.handleClipboardPaste}
            className="edit-textarea"
            autoFocus
            rows={6}
          />
          <div
            className={`char-counter ${editContent.length > 900 ? 'warning' : ''} ${editContent.length >= 1000 ? 'danger' : ''}`}
          >
            {editContent.length}/1000
          </div>
        </div>
      ) : (
        <div className="item-text item-text--markdown markdown-preview-panel">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{editContent}</ReactMarkdown>
        </div>
      )}

      {ATTACHMENT_KIND_ORDER.map((kind) => (
        <div key={kind} className="edit-image-container">
          <AttachmentField
            kind={kind}
            editor={attachments}
            mode="edit"
            currentFilename={currentAttachments[kind]}
          />
        </div>
      ))}

      <div className="edit-actions">
        <button onClick={handleSave} className="save-button" disabled={!editContent.trim() || editContent.length > 1000}>
          💾 保存
        </button>
        <button onClick={onCancel} className="cancel-button">
          ❌ キャンセル
        </button>
      </div>
    </div>
  );
}
