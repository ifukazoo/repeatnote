import { useState, useEffect, useRef } from 'react'
import type { Item, UpdateItemData } from './types'
import { getItems, createItem, updateItem, reviewItem, deleteItem, ApiError } from './api'
import { IMAGE_CONFIG } from './constants'
import './App.css'

function App() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [newItemContent, setNewItemContent] = useState('')
  const [newItemImage, setNewItemImage] = useState<File | null>(null)
  const [showAllItems, setShowAllItems] = useState(false)
  const [editingItem, setEditingItem] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editImage, setEditImage] = useState<File | null>(null)
  const [removeEditImage, setRemoveEditImage] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  // アイテム一覧を取得
  const loadItems = async () => {
    try {
      setLoading(true)
      setError('')
      const itemsData = await getItems()
      setItems(itemsData)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 初回ロード
  useEffect(() => {
    loadItems()
  }, [])

  // ドロップダウンの外部クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownOpen !== null) {
        const target = event.target as Element
        if (!target.closest('.dropdown-container')) {
          setDropdownOpen(null)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  // ファイル入力リセット共通関数
  const resetFileInput = (ref: React.RefObject<HTMLInputElement | null>) => {
    if (ref.current) {
      ref.current.value = ''
    }
  }

  // 画像バリデーション共通関数
  const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
    // 画像形式チェック
    if (!IMAGE_CONFIG.ALLOWED_TYPES.includes(file.type as (typeof IMAGE_CONFIG.ALLOWED_TYPES)[number])) {
      return {
        isValid: false,
        error: IMAGE_CONFIG.ERROR_MESSAGES.INVALID_TYPE
      }
    }

    // サイズチェック
    if (file.size > IMAGE_CONFIG.MAX_SIZE) {
      return {
        isValid: false,
        error: IMAGE_CONFIG.ERROR_MESSAGES.FILE_TOO_LARGE
      }
    }

    return { isValid: true }
  }

  // 画像ファイル選択
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const validation = validateImageFile(file)
      if (!validation.isValid) {
        setError(validation.error!)
        return
      }

      setNewItemImage(file)
      setError('')
    }
  }

  // 編集時の画像ファイル選択
  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const validation = validateImageFile(file)
      if (!validation.isValid) {
        setError(validation.error!)
        return
      }

      setEditImage(file)
      setRemoveEditImage(false) // 新しい画像が選択されたら削除フラグを解除
      setError('')
    }
  }

  // 新しいアイテムを追加
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemContent.trim()) return

    try {
      setError('')
      const newItem = await createItem({
        content: newItemContent.trim(),
        image: newItemImage || undefined
      })
      setItems(prev => [newItem, ...prev])
      setNewItemContent('')
      setNewItemImage(null)
      // ファイル入力をリセット
      resetFileInput(fileInputRef)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '作成に失敗しました')
    }
  }

  // 復習処理
  const handleReview = async (id: number, quality: number) => {
    try {
      setError('')
      const updatedItem = await reviewItem(id, quality)
      setItems(prev => prev.map(item => item.id === id ? updatedItem : item))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '復習処理に失敗しました')
    }
  }

  // アイテム編集開始
  const handleEditStart = (item: Item) => {
    setEditingItem(item.id)
    setEditContent(item.content)
    setEditImage(null)
    setRemoveEditImage(false)
    // ファイル入力をリセット
    resetFileInput(editFileInputRef)
  }

  // アイテム編集キャンセル
  const handleEditCancel = () => {
    setEditingItem(null)
    setEditContent('')
    setEditImage(null)
    setRemoveEditImage(false)
    // ファイル入力をリセット
    resetFileInput(editFileInputRef)
  }

  // アイテム編集保存
  const handleEditSave = async (id: number) => {
    if (!editContent.trim()) return

    try {
      setError('')
      const updateData: UpdateItemData = {
        content: editContent.trim()
      }

      // 画像関連の処理
      if (editImage) {
        updateData.image = editImage
      }
      if (removeEditImage) {
        updateData.removeImage = true
      }

      const updatedItem = await updateItem(id, updateData)
      setItems(prev => prev.map(item => item.id === id ? updatedItem : item))
      setEditingItem(null)
      setEditContent('')
      setEditImage(null)
      setRemoveEditImage(false)
      // ファイル入力をリセット
      resetFileInput(editFileInputRef)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '更新に失敗しました')
    }
  }

  // アイテム削除
  const handleDelete = async (id: number) => {
    const item = items.find(item => item.id === id)
    const content = item?.content || ''
    const preview = content.length > 30 ? content.substring(0, 30) + '...' : content

    if (!confirm(`学習項目を削除しますか？\n\n「${preview}」\n\n※この操作は取り消せません。`)) return

    try {
      setError('')
      await deleteItem(id)
      setItems(prev => prev.filter(item => item.id !== id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '削除に失敗しました')
    }
  }

  // 復習が必要なアイテムかチェック
  const needsReview = (item: Item): boolean => {
    if (!item.next_review) return true
    return new Date(item.next_review) <= new Date()
  }

  // 表示するアイテムを決定
  const displayItems = showAllItems ? items : items.filter(item => needsReview(item))
  const reviewItemsCount = items.filter(item => needsReview(item)).length

  return (
    <div className="app">
      <header>
        <h1>📚 RepeatNote</h1>
        <p>間隔反復学習で効率的に記憶定着</p>
      </header>

      {error && (
        <div className="error">
          ❌ {error}
        </div>
      )}

      {/* 新規アイテム追加フォーム */}
      <section className="add-item">
        <h2>新しい学習項目を追加</h2>
        <form onSubmit={handleCreateItem}>
          <div className="input-wrapper">
            <textarea
              value={newItemContent}
              onChange={(e) => setNewItemContent(e.target.value)}
              placeholder="学習内容を入力してください"
              maxLength={750}
              rows={1}
              className="add-textarea"
            />
            <div className={`char-counter ${newItemContent.length > 650 ? 'warning' : ''} ${newItemContent.length >= 750 ? 'danger' : ''}`}>
              {newItemContent.length}/750
            </div>
          </div>

          {/* 画像アップロード */}
          <div className="image-upload-container">
            <label htmlFor="image-upload" className="image-upload-label">
              📷 画像を追加 (任意)
            </label>
            <input
              type="file"
              id="image-upload"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageChange}
              className="image-upload-input"
            />
            {newItemImage && (
              <div className="image-preview">
                <span>選択済み: {newItemImage.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setNewItemImage(null)
                    resetFileInput(fileInputRef)
                  }}
                  className="remove-image-btn"
                >
                  ❌
                </button>
              </div>
            )}
          </div>

          <button type="submit" disabled={!newItemContent.trim()}>
            ➕ 追加
          </button>
        </form>
      </section>

      {/* アイテム一覧 */}
      <section className="items">
        <div className="items-header">
          <h2>{showAllItems ? '学習項目一覧' : '復習が必要な項目'}</h2>
          <div className="view-toggle">
            <button
              onClick={() => setShowAllItems(!showAllItems)}
              className="toggle-button"
            >
              {showAllItems ? '復習項目のみ表示' : `全項目表示 (${items.length})`}
            </button>
            {!showAllItems && reviewItemsCount > 0 && (
              <span className="review-count">復習項目: {reviewItemsCount}件</span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="loading">⏳ 読み込み中...</div>
        ) : items.length === 0 ? (
          <div className="empty">
            📝 まだ学習項目がありません。上記フォームから追加してください。
          </div>
        ) : displayItems.length === 0 ? (
          <div className="empty">
            🎉 復習が必要な項目はありません！お疲れ様でした。
          </div>
        ) : (
          <div className="items-list">
            {displayItems.map((item) => (
              <div key={item.id} className={`item ${needsReview(item) ? 'needs-review' : 'waiting'}`}>
                <div className="item-content">
                  {editingItem === item.id ? (
                    <div className="edit-form">
                      <div className="input-wrapper">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          maxLength={750}
                          className="edit-textarea"
                          autoFocus
                          rows={6}
                        />
                        <div className={`char-counter ${editContent.length > 650 ? 'warning' : ''} ${editContent.length >= 750 ? 'danger' : ''}`}>
                          {editContent.length}/750
                        </div>
                      </div>

                      {/* 編集時の画像操作 */}
                      <div className="edit-image-container">
                        {/* 現在の画像表示 */}
                        {item.image_url && !removeEditImage && (
                          <div className="current-image">
                            <img src={item.image_url} alt="現在の画像" className="edit-current-image" />
                            <button
                              type="button"
                              onClick={() => setRemoveEditImage(true)}
                              className="remove-current-image-btn"
                            >
                              🗑️ 画像を削除
                            </button>
                          </div>
                        )}

                        {/* 画像削除状態の表示 */}
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

                        {/* 新しい画像アップロード */}
                        <div className="edit-image-upload">
                          <label htmlFor="edit-image-upload" className="image-upload-label">
                            📷 {item.image_url ? '画像を変更' : '画像を追加'} (任意)
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
                              <span>新しい画像: {editImage.name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditImage(null)
                                  setRemoveEditImage(false)
                                  resetFileInput(editFileInputRef)
                                }}
                                className="remove-image-btn"
                              >
                                ❌
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="edit-actions">
                        <button
                          onClick={() => handleEditSave(item.id)}
                          className="save-button"
                          disabled={!editContent.trim()}
                        >
                          💾 保存
                        </button>
                        <button
                          onClick={handleEditCancel}
                          className="cancel-button"
                        >
                          ❌ キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* 画像表示 */}
                      {item.image_url && (
                        <div className="item-image">
                          <img src={item.image_url} alt="学習項目の画像" loading="lazy" />
                        </div>
                      )}

                      <div className="content-with-actions">
                        <div className="item-text">{item.content}</div>
                        <div className="item-actions-menu">
                          <div className="dropdown-container">
                            <button
                              onClick={() => setDropdownOpen(dropdownOpen === item.id ? null : item.id)}
                              className="dropdown-toggle"
                              title="アクション"
                            >
                              ⌄
                            </button>
                            {dropdownOpen === item.id && (
                              <div className="dropdown-menu">
                                <button
                                  onClick={() => {
                                    handleEditStart(item)
                                    setDropdownOpen(null)
                                  }}
                                  className="dropdown-item"
                                >
                                  ✏️ 編集
                                </button>
                                <button
                                  onClick={() => {
                                    handleDelete(item.id)
                                    setDropdownOpen(null)
                                  }}
                                  className="dropdown-item delete-item"
                                >
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
                  )}
                </div>

                {editingItem !== item.id && (
                  <div className="item-actions">
                    {needsReview(item) ? (
                      <div className="action-buttons">
                        <button
                          onClick={() => handleReview(item.id, 0)}
                          className="quality-0"
                          title="まったく覚えていない"
                        >
                          😵 忘れた
                        </button>
                        <button
                          onClick={() => handleReview(item.id, 2)}
                          className="quality-2"
                          title="少し思い出せた"
                        >
                          🤔 曖昧
                        </button>
                        <button
                          onClick={() => handleReview(item.id, 3)}
                          className="quality-3"
                          title="なんとか思い出せた"
                        >
                          💡 思い出した
                        </button>
                        <button
                          onClick={() => handleReview(item.id, 5)}
                          className="quality-5"
                          title="完璧に覚えている"
                        >
                          ✨ 完璧
                        </button>
                      </div>
                  ) : (
                    <div className="action-buttons">
                      <span className="waiting-text">⏰ 復習待ち</span>
                    </div>
                  )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default App
