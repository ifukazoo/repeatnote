import { useState, useEffect } from 'react'
import type { Item } from './types'
import { getItems, createItem, reviewItem, deleteItem, ApiError } from './api'
import './App.css'

function App() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [newItemContent, setNewItemContent] = useState('')
  const [reviewingItem, setReviewingItem] = useState<number | null>(null)

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
      setReviewingItem(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '復習処理に失敗しました')
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
        <h2>学習項目一覧</h2>

        {loading ? (
          <div className="loading">⏳ 読み込み中...</div>
        ) : items.length === 0 ? (
          <div className="empty">
            📝 まだ学習項目がありません。上記フォームから追加してください。
          </div>
        ) : (
          <div className="items-list">
            {items.map((item) => (
              <div key={item.id} className={`item ${needsReview(item) ? 'needs-review' : 'waiting'}`}>
                <div className="item-content">
                  <strong>{item.content}</strong>
                  <div className="item-meta">
                    <span>復習回数: {item.review_count}</span>
                    <span>間隔: {item.interval_days}日</span>
                    <span>難易度: {item.ease_factor.toFixed(1)}</span>
                    {item.next_review && (
                      <span>次回復習: {new Date(item.next_review).toLocaleDateString('ja-JP')}</span>
                    )}
                  </div>
                </div>

                <div className="item-actions">
                  {needsReview(item) ? (
                    reviewingItem === item.id ? (
                      <div className="review-buttons">
                        <p>復習の品質を選択:</p>
                        <div className="quality-buttons">
                          {[0, 1, 2, 3, 4, 5].map(quality => (
                            <button
                              key={quality}
                              onClick={() => handleReview(item.id, quality)}
                              className={`quality-${quality}`}
                              title={quality >= 3 ? '正解' : '不正解'}
                            >
                              {quality}
                            </button>
                          ))}
                        </div>
                        <button onClick={() => setReviewingItem(null)} className="cancel">
                          キャンセル
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setReviewingItem(item.id)}
                        className="review"
                      >
                        🔄 復習する
                      </button>
                    )
                  ) : (
                    <span className="waiting-text">⏰ 復習待ち</span>
                  )}

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="delete"
                  >
                    🗑️ 削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default App
