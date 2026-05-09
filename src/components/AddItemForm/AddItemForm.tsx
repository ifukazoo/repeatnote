import { useState } from 'react';
import { createItem, ApiError } from '../../api';
import type { Item } from '../../types';
import { useImageUpload } from '../../hooks/useImageUpload';
import './AddItemForm.css';
import '../../shared.css';

interface AddItemFormProps {
  onItemCreated: (item: Item) => void;
  onError: (message: string) => void;
}

export function AddItemForm({ onItemCreated, onError }: AddItemFormProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemContent, setNewItemContent] = useState('');
  const { image, imagePreview, fileInputRef, handleImageChange, handleClipboardPaste, clearImage } =
    useImageUpload(onError);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemContent.trim()) return;

    try {
      const newItem = await createItem({
        content: newItemContent.trim(),
        image: image || undefined,
      });
      onItemCreated(newItem);
      setNewItemContent('');
      clearImage();
      setShowAddForm(false);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : '作成に失敗しました');
    }
  };

  const handleCancel = () => {
    setNewItemContent('');
    clearImage();
    setShowAddForm(false);
  };

  return (
    <section className="add-item">
      {!showAddForm ? (
        <button onClick={() => setShowAddForm(true)} className="add-form-toggle">
          ➕ 新しいアイテムを追加
        </button>
      ) : (
        <div className="add-form-expanded">
          <h2>新しい学習項目を追加</h2>
          <form onSubmit={handleCreateItem}>
            <div className="input-wrapper">
              <textarea
                value={newItemContent}
                onChange={(e) => setNewItemContent(e.target.value)}
                onPaste={handleClipboardPaste}
                placeholder="学習内容を入力してください"
                rows={1}
                className="add-textarea"
              />
              <div
                className={`char-counter ${newItemContent.length > 900 ? 'warning' : ''} ${newItemContent.length >= 1000 ? 'danger' : ''}`}
              >
                {newItemContent.length}/1000
              </div>
            </div>

            <div className="image-upload-container">
              <label htmlFor="image-upload" className="image-upload-label">
                📷 画像を追加 (任意・クリップボードからペースト可能)
              </label>
              <input
                type="file"
                id="image-upload"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageChange}
                className="image-upload-input"
              />
              {image && (
                <div className="image-preview">
                  <img src={imagePreview!} alt="選択した画像" className="preview-thumbnail" />
                  <span>選択済み: {image.name}</span>
                  <button type="button" onClick={clearImage} className="remove-image-btn">
                    ❌
                  </button>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" disabled={!newItemContent.trim() || newItemContent.length > 1000}>
                ➕ 追加
              </button>
              <button type="button" onClick={handleCancel} className="cancel-btn">
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
