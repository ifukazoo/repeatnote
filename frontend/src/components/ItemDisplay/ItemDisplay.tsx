import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Item } from '../../types';
import { getImageUrl } from '../../api';
import './ItemDisplay.css';
import '../../shared.css';

interface ItemDisplayProps {
  item: Item;
  isCopied: boolean;
  isDropdownOpen: boolean;
  onDropdownToggle: () => void;
  onEditStart: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onImageClick: (src: string) => void;
}

export function ItemDisplay({
  item,
  isCopied,
  isDropdownOpen,
  onDropdownToggle,
  onEditStart,
  onDelete,
  onCopy,
  onImageClick,
}: ItemDisplayProps) {
  const imageSrc = item.image_filename ? getImageUrl(item.image_filename) : null;

  return (
    <>
      {imageSrc && (
        <div className="item-image">
          <img
            src={imageSrc}
            alt="学習項目の画像"
            loading="lazy"
            onClick={() => onImageClick(imageSrc)}
            style={{ cursor: 'pointer' }}
            title="クリックして拡大表示"
          />
        </div>
      )}

      <div className="item-text item-text--markdown">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.content}</ReactMarkdown>
      </div>

      <div className="content-actions-bar">
        <button
          onClick={onCopy}
          className="copy-button"
          title={isCopied ? 'コピー済み' : 'クリップボードにコピー'}
        >
          {isCopied ? '✓ コピー済み' : '📋 コピー'}
        </button>
        <div className="item-actions-menu">
          <div className="dropdown-container">
            <button onClick={onDropdownToggle} className="dropdown-toggle" title="アクション">
              ⌄
            </button>
            {isDropdownOpen && (
              <div className="dropdown-menu">
                <button onClick={onEditStart} className="dropdown-item">
                  ✏️ 編集
                </button>
                <button onClick={onDelete} className="dropdown-item delete-item">
                  🗑️ 削除
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="item-meta">
        <span>復習回数: {item.review_count}</span>
        <span>間隔: {item.interval_days}日</span>
        <span>難易度: {item.ease_factor.toFixed(1)}</span>
        {item.next_review && (
          <span>次回復習: {new Date(item.next_review).toLocaleDateString('ja-JP')}</span>
        )}
      </div>
    </>
  );
}
