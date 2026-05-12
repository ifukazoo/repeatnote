import type { Item } from '../../types';
import { ItemCard } from '../ItemCard/ItemCard';
import './ItemList.css';

function needsReview(item: Item): boolean {
  if (!item.next_review) return true;
  return new Date(item.next_review) <= new Date();
}

function sortByNextReview(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    if (a.next_review === null && b.next_review === null) return 0;
    if (a.next_review === null) return -1;
    if (b.next_review === null) return 1;
    return new Date(a.next_review).getTime() - new Date(b.next_review).getTime();
  });
}

interface ItemListProps {
  items: Item[];
  loading: boolean;
  showAllItems: boolean;
  onToggleShowAll: () => void;
  searchText: string;
  onSearchChange: (text: string) => void;
  editingItem: string | null;
  copiedItems: Set<string>;
  dropdownOpen: string | null;
  onDropdownToggle: (id: string) => void;
  onEditStart: (id: string) => void;
  onEditSave: (
    id: string,
    content: string,
    image: File | null,
    removeImage: boolean,
  ) => Promise<void>;
  onEditCancel: () => void;
  onDelete: (id: string) => void;
  onReview: (id: string, quality: number) => void;
  onMaster: (id: string) => void;
  onUnmaster: (id: string) => void;
  onCopy: (id: string, content: string) => void;
  onImageClick: (src: string) => void;
  onError: (message: string) => void;
}

export function ItemList({
  items,
  loading,
  showAllItems,
  onToggleShowAll,
  searchText,
  onSearchChange,
  editingItem,
  copiedItems,
  dropdownOpen,
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
}: ItemListProps) {
  const sortedItems = sortByNextReview(items);
  const statusFilteredItems = showAllItems
    ? sortedItems
    : sortedItems.filter((item) => needsReview(item) && !item.mastered);
  const displayItems = searchText.trim()
    ? statusFilteredItems.filter((item) =>
        item.content.toLowerCase().includes(searchText.toLowerCase()),
      )
    : statusFilteredItems;

  const reviewItemsCount = items.filter((item) => needsReview(item) && !item.mastered).length;
  const waitingItemsCount = items.filter((item) => !needsReview(item) && !item.mastered).length;
  const masteredItemsCount = items.filter((item) => item.mastered).length;

  return (
    <section className="items">
      <div className="items-header">
        <h2>{showAllItems ? 'すべての学習項目' : '復習が必要な項目'}</h2>
        <div className="view-toggle">
          <button onClick={onToggleShowAll} className="toggle-button">
            {showAllItems ? '復習項目のみ' : 'すべて表示'}
          </button>
          {!showAllItems && reviewItemsCount > 0 && (
            <span className="review-count">{reviewItemsCount}件</span>
          )}
          {showAllItems && (
            <span className="review-count">
              復習: {reviewItemsCount}件 / 待機: {waitingItemsCount}件 / 覚えた:{' '}
              {masteredItemsCount}件
            </span>
          )}
        </div>
      </div>

      <div className="search-container">
        <input
          type="text"
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="キーワードで絞り込み..."
          className="search-input"
        />
        {searchText && (
          <button onClick={() => onSearchChange('')} className="search-clear-btn" title="クリア">
            ✕
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading">⏳ 読み込み中...</div>
      ) : items.length === 0 ? (
        <div className="empty">
          📝 まだ学習項目がありません。上記フォームから追加してください。
        </div>
      ) : displayItems.length === 0 ? (
        <div className="empty">🎉 復習が必要な項目はありません！お疲れ様でした。</div>
      ) : (
        <div className="items-list">
          {displayItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              isEditing={editingItem === item.id}
              isCopied={copiedItems.has(item.id)}
              isDropdownOpen={dropdownOpen === item.id}
              needsReview={needsReview(item)}
              onDropdownToggle={() => onDropdownToggle(item.id)}
              onEditStart={() => onEditStart(item.id)}
              onEditSave={(content, image, removeImage) =>
                onEditSave(item.id, content, image, removeImage)
              }
              onEditCancel={onEditCancel}
              onDelete={() => onDelete(item.id)}
              onReview={(quality) => onReview(item.id, quality)}
              onMaster={() => onMaster(item.id)}
              onUnmaster={() => onUnmaster(item.id)}
              onCopy={() => onCopy(item.id, item.content)}
              onImageClick={onImageClick}
              onError={onError}
            />
          ))}
        </div>
      )}
    </section>
  );
}
