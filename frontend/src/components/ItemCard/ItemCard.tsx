import type { Item } from '../../types';
import { getImageUrl } from '../../api';
import { EditForm } from '../EditForm/EditForm';
import { ItemDisplay } from '../ItemDisplay/ItemDisplay';
import './ItemCard.css';

interface ItemCardProps {
  item: Item;
  isEditing: boolean;
  isCopied: boolean;
  isDropdownOpen: boolean;
  needsReview: boolean;
  onDropdownToggle: () => void;
  onEditStart: () => void;
  onEditSave: (content: string, image: File | null, removeImage: boolean) => Promise<void>;
  onEditCancel: () => void;
  onDelete: () => void;
  onReview: (quality: number) => void;
  onMaster: () => void;
  onUnmaster: () => void;
  onCopy: () => void;
  onImageClick: (src: string) => void;
  onError: (message: string) => void;
}

export function ItemCard({
  item,
  isEditing,
  isCopied,
  isDropdownOpen,
  needsReview,
  onDropdownToggle,
  onEditStart,
  onEditSave,
  onEditCancel,
  onDelete,
  onReview,
  onMaster,
  onUnmaster,
  onCopy,
  onImageClick,
  onError,
}: ItemCardProps) {
  const statusClass = item.mastered ? 'mastered' : needsReview ? 'needs-review' : 'waiting';

  return (
    <div className={`item ${statusClass}`}>
      <div className="item-content">
        {isEditing ? (
          <EditForm
            initialContent={item.content}
            currentImageUrl={item.image_filename ? getImageUrl(item.image_filename) : null}
            onSave={onEditSave}
            onCancel={onEditCancel}
            onError={onError}
          />
        ) : (
          <ItemDisplay
            item={item}
            isCopied={isCopied}
            isDropdownOpen={isDropdownOpen}
            onDropdownToggle={onDropdownToggle}
            onEditStart={onEditStart}
            onDelete={onDelete}
            onCopy={onCopy}
            onImageClick={onImageClick}
          />
        )}
      </div>

      {!isEditing && (
        <div className="item-actions">
          {item.mastered ? (
            <div className="action-buttons">
              <span className="waiting-text">✅ 覚えた項目</span>
              <button
                onClick={onUnmaster}
                className="unmaster-button"
                title="覚え直し（復習スケジュールをリセット）"
              >
                🔄 覚え直し
              </button>
            </div>
          ) : needsReview ? (
            <div className="action-buttons">
              <div className="review-buttons">
                <button onClick={() => onReview(2)} className="quality-2" title="少し思い出せた">
                  🤔 曖昧
                </button>
                <button onClick={() => onReview(5)} className="quality-5" title="完璧に覚えている">
                  ✨ 完璧
                </button>
              </div>
              <div className="master-section">
                <button
                  onClick={onMaster}
                  className="master-button"
                  title="完全に覚えた（復習から外す）"
                >
                  🎯 覚えた
                </button>
              </div>
            </div>
          ) : (
            <div className="action-buttons">
              <span className="waiting-text">⏰ 復習待ち</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
