import { useState, useEffect } from 'react'
import type { Item } from './types'
import { getItems, createItem, updateItem, reviewItem, deleteItem, ApiError } from './api'
import './App.css'

function App() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [newItemContent, setNewItemContent] = useState('')
  const [showAllItems, setShowAllItems] = useState(false)
  const [editingItem, setEditingItem] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')

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

  // 新しいアイテムを追加
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemContent.trim()) return

    try {
      setError('')
      const newItem = await createItem({ content: newItemContent.trim() })
      setItems(prev => [newItem, ...prev])
      setNewItemContent('')
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
  }

  // アイテム編集キャンセル
  const handleEditCancel = () => {
    setEditingItem(null)
    setEditContent('')
  }

  // アイテム編集保存
  const handleEditSave = async (id: number) => {
    if (!editContent.trim()) return

    try {
      setError('')
      const updatedItem = await updateItem(id, { content: editContent.trim() })
      setItems(prev => prev.map(item => item.id === id ? updatedItem : item))
      setEditingItem(null)
      setEditContent('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '更新に失敗しました')
    }
  }

  // アイテム削除
  const handleDelete = async (id: number) => {
    if (!confirm('このアイテムを削除しますか？')) return

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
          <input
            type="text"
            value={newItemContent}
            onChange={(e) => setNewItemContent(e.target.value)}
            placeholder="学習内容を入力してください"
            maxLength={500}
          />
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
                      <input
                        type="text"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        maxLength={500}
                        className="edit-input"
                        autoFocus
                      />
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
                      <div className="content-with-edit">
                        <strong>{item.content}</strong>
                        <button
                          onClick={() => handleEditStart(item)}
                          className="edit-button"
                          title="編集"
                        >
                          ✏️
                        </button>
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
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="delete"
                        >
                          🗑️ 削除
                        </button>
                      </div>
                  ) : (
                    <div className="action-buttons">
                      <span className="waiting-text">⏰ 復習待ち</span>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="delete"
                      >
                        🗑️ 削除
                      </button>
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
