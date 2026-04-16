import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useImageUpload } from '../../hooks/useImageUpload';
import './EditForm.css';
import '../../shared.css';

interface EditFormProps {
  initialContent: string;
  currentImageUrl: string | null;
  onSave: (content: string, image: File | null, removeImage: boolean) => Promise<void>;
  onCancel: () => void;
  onError: (message: string) => void;
}

export function EditForm({
  initialContent,
  currentImageUrl,
  onSave,
  onCancel,
  onError,
}: EditFormProps) {
  const [editContent, setEditContent] = useState(initialContent);
  const [removeEditImage, setRemoveEditImage] = useState(false);
  const [previewMode, setPreviewMode] = useState<'write' | 'preview'>('write');
  const {
    image: editImage,
    imagePreview: editImagePreview,
    fileInputRef: editFileInputRef,
    handleImageChange: handleEditImageChange,
    handleClipboardPaste,
    clearImage: clearEditImage,
  } = useImageUpload(onError);

  const handleSave = async () => {
    if (!editContent.trim()) return;
    await onSave(editContent.trim(), editImage, removeEditImage);
  };

  const handleClearNewImage = () => {
    clearEditImage();
    setRemoveEditImage(false);
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
            onPaste={handleClipboardPaste}
            maxLength={750}
            className="edit-textarea"
            autoFocus
            rows={6}
          />
          <div
            className={`char-counter ${editContent.length > 650 ? 'warning' : ''} ${editContent.length >= 750 ? 'danger' : ''}`}
          >
            {editContent.length}/750
          </div>
        </div>
      ) : (
        <div className="item-text item-text--markdown markdown-preview-panel">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{editContent}</ReactMarkdown>
        </div>
      )}

      <div className="edit-image-container">
        {currentImageUrl && !removeEditImage && (
          <div className="current-image">
            <img src={currentImageUrl} alt="現在の画像" className="edit-current-image" />
            <button
              type="button"
              onClick={() => setRemoveEditImage(true)}
              className="remove-current-image-btn"
            >
              🗑️ 画像を削除
            </button>
          </div>
        )}

        {removeEditImage && (
          <div className="image-removed">
            <span>画像が削除されます</span>
            <button
              type="button"
              onClick={() => setRemoveEditImage(false)}
              className="undo-remove-btn"
            >
              ↶ 削除を取り消し
            </button>
          </div>
        )}

        <div className="edit-image-upload">
          <label htmlFor="edit-image-upload" className="image-upload-label">
            📷 {currentImageUrl ? '画像を変更' : '画像を追加'} (任意・クリップボードからペースト可能)
          </label>
          <input
            type="file"
            id="edit-image-upload"
            ref={editFileInputRef}
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleEditImageChange}
            className="image-upload-input"
          />
          {editImage && (
            <div className="image-preview">
              <img
                src={editImagePreview!}
                alt="選択した新しい画像"
                className="preview-thumbnail"
              />
              <span>新しい画像: {editImage.name}</span>
              <button type="button" onClick={handleClearNewImage} className="remove-image-btn">
                ❌
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="edit-actions">
        <button onClick={handleSave} className="save-button" disabled={!editContent.trim()}>
          💾 保存
        </button>
        <button onClick={onCancel} className="cancel-button">
          ❌ キャンセル
        </button>
      </div>
    </div>
  );
}
