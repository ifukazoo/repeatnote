import { useState, useEffect } from 'react';
import type { Item, UpdateItemData } from './types';
import {
  getItems,
  updateItem,
  reviewItem,
  deleteItem,
  masterItem,
  unmasterItem,
  ApiError,
} from './api';
import { useImageModal } from './hooks/useImageModal';
import { useDropdown } from './hooks/useDropdown';
import { AddItemForm } from './components/AddItemForm/AddItemForm';
import { ItemList } from './components/ItemList/ItemList';
import { ImageModal } from './components/ImageModal/ImageModal';
import './App.css';
import './shared.css';

function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showAllItems, setShowAllItems] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const { imageModalOpen, modalImageSrc, openImageModal, closeImageModal } = useImageModal();
  const { dropdownOpen, setDropdownOpen } = useDropdown();

  const loadItems = async () => {
    try {
      setLoading(true);
      setError('');
      const itemsData = await getItems();
      setItems(itemsData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleEditStart = (id: string) => {
    setDropdownOpen(null);
    setEditingItem(id);
  };

  const handleEditCancel = () => {
    setEditingItem(null);
  };

  const handleEditSave = async (
    id: string,
    content: string,
    image: File | null,
    removeImage: boolean,
  ) => {
    try {
      setError('');
      const updateData: UpdateItemData = { content };
      if (image) updateData.image = image;
      if (removeImage) updateData.removeImage = true;
      const updatedItem = await updateItem(id, updateData);
      setItems((prev) => prev.map((item) => (item.id === id ? updatedItem : item)));
      setEditingItem(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '更新に失敗しました');
    }
  };

  const handleDelete = async (id: string) => {
    setDropdownOpen(null);
    const item = items.find((item) => item.id === id);
    const content = item?.content || '';
    const preview = content.length > 30 ? content.substring(0, 30) + '...' : content;

    if (!confirm(`学習項目を削除しますか？\n\n「${preview}」\n\n※この操作は取り消せません。`))
      return;

    try {
      setError('');
      await deleteItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '削除に失敗しました');
    }
  };

  const handleReview = async (id: string, quality: number) => {
    try {
      setError('');
      const updatedItem = await reviewItem(id, quality);
      setItems((prev) => prev.map((item) => (item.id === id ? updatedItem : item)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '復習処理に失敗しました');
    }
  };

  const handleMaster = async (id: string) => {
    const confirmed = window.confirm('この項目を完全に覚えましたか？\n復習リストから外れます。');
    if (!confirmed) return;
    try {
      setError('');
      const masteredItem = await masterItem(id);
      setItems((prev) => prev.map((item) => (item.id === id ? masteredItem : item)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '「覚えた」処理に失敗しました');
    }
  };

  const handleUnmaster = async (id: string) => {
    try {
      setError('');
      const unmasteredItem = await unmasterItem(id);
      setItems((prev) => prev.map((item) => (item.id === id ? unmasteredItem : item)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '「覚え直し」処理に失敗しました');
    }
  };

  const handleCopy = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedItems((prev) => new Set(prev).add(id));
      setTimeout(() => {
        setCopiedItems((prev) => {
          const updated = new Set(prev);
          updated.delete(id);
          return updated;
        });
      }, 2000);
    } catch (err) {
      console.error('クリップボードへのコピーに失敗しました:', err);
      setError('コピーに失敗しました');
    }
  };

  const handleDropdownToggle = (id: string) => {
    setDropdownOpen(dropdownOpen === id ? null : id);
  };

  return (
    <div className="app">
      <header>
        <h1>📚 RepeatNote</h1>
      </header>

      {error && <div className="error">❌ {error}</div>}

      <AddItemForm
        onItemCreated={(item) => setItems((prev) => [item, ...prev])}
        onError={setError}
      />

      <ItemList
        items={items}
        loading={loading}
        showAllItems={showAllItems}
        onToggleShowAll={() => setShowAllItems(!showAllItems)}
        searchText={searchText}
        onSearchChange={setSearchText}
        editingItem={editingItem}
        copiedItems={copiedItems}
        dropdownOpen={dropdownOpen}
        onDropdownToggle={handleDropdownToggle}
        onEditStart={handleEditStart}
        onEditSave={handleEditSave}
        onEditCancel={handleEditCancel}
        onDelete={handleDelete}
        onReview={handleReview}
        onMaster={handleMaster}
        onUnmaster={handleUnmaster}
        onCopy={handleCopy}
        onImageClick={openImageModal}
        onError={setError}
      />

      <ImageModal isOpen={imageModalOpen} imageSrc={modalImageSrc} onClose={closeImageModal} />
    </div>
  );
}

export default App;
