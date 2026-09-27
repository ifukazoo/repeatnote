import { useState } from 'react';
import { createItem, ApiError } from '../../api';
import type { Item } from '../../types';
import { useAttachmentsEditor } from '../../hooks/useAttachmentsEditor';
import { ATTACHMENT_KIND_ORDER } from '../../constants';
import { AttachmentField } from '../AttachmentField/AttachmentField';
import './AddItemForm.css';
import '../../shared.css';

interface AddItemFormProps {
  onItemCreated: (item: Item) => void;
  onError: (message: string) => void;
}

export function AddItemForm({ onItemCreated, onError }: AddItemFormProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemContent, setNewItemContent] = useState('');
  const attachments = useAttachmentsEditor(onError);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemContent.trim()) return;

    try {
      const newItem = await createItem({
        content: newItemContent.trim(),
        files: attachments.files(),
      });
      onItemCreated(newItem);
      setNewItemContent('');
      attachments.reset();
      setShowAddForm(false);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : '作成に失敗しました');
    }
  };

  const handleCancel = () => {
    setNewItemContent('');
    attachments.reset();
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
                onPaste={attachments.handleClipboardPaste}
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

            {ATTACHMENT_KIND_ORDER.map((kind) => (
              <AttachmentField key={kind} kind={kind} editor={attachments} mode="add" />
            ))}

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
