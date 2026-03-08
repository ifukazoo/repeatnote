import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// API関数をモック
vi.mock('../api', () => ({
  getItems: vi.fn().mockResolvedValue([]),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  reviewItem: vi.fn(),
  deleteItem: vi.fn(),
  masterItem: vi.fn(),
  unmasterItem: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = 'ApiError';
    }
  },
}));

describe('App コンポーネント', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('初期状態でヘッダーが表示される', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /RepeatNote/ })).toBeInTheDocument();
    });
  });

  it('新規追加フォームが初期状態で折りたたまれている', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('➕ 新しいアイテムを追加')).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('学習内容を入力してください')).not.toBeInTheDocument();
    });
  });

  it('追加フォームを展開できる', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('➕ 新しいアイテムを追加')).toBeInTheDocument();
    });

    const addButton = screen.getByText('➕ 新しいアイテムを追加');
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('学習内容を入力してください')).toBeInTheDocument();
      expect(screen.getByText('➕ 追加')).toBeInTheDocument();
      expect(screen.getByText('キャンセル')).toBeInTheDocument();
    });
  });

  it('空のアイテムリストで適切なメッセージが表示される', async () => {
    render(<App />);

    // getItemsがからの配列を返すのでemptyメッセージが表示される
    expect(await screen.findByText(/まだ学習項目がありません/)).toBeInTheDocument();
  });

  it('表示切り替えボタンが存在する', async () => {
    render(<App />);

    expect(await screen.findByText('すべて表示')).toBeInTheDocument();
  });

  it('表示切り替えが機能する', async () => {
    const user = userEvent.setup();
    render(<App />);

    const toggleButton = await screen.findByText('すべて表示');
    await user.click(toggleButton);

    expect(screen.getByText('復習項目のみ')).toBeInTheDocument();
    expect(screen.getByText('すべての学習項目')).toBeInTheDocument();
  });

  it('文字数カウンターが動作する', async () => {
    const user = userEvent.setup();
    render(<App />);

    // フォームを展開
    const addButton = screen.getByText('➕ 新しいアイテムを追加');
    await user.click(addButton);

    const textarea = screen.getByPlaceholderText('学習内容を入力してください');

    // 文字を入力
    await user.type(textarea, 'テスト項目');

    expect(screen.getByText('5/750')).toBeInTheDocument();
  });

  it('750文字制限の警告が表示される', async () => {
    const user = userEvent.setup();
    render(<App />);

    // フォームを展開
    const addButton = screen.getByText('➕ 新しいアイテムを追加');
    await user.click(addButton);

    const textarea = screen.getByPlaceholderText('学習内容を入力してください');

    // 650文字以上入力（警告色）
    const longText = 'あ'.repeat(651);
    await user.type(textarea, longText);

    const counter = screen.getByText('651/750');
    expect(counter).toHaveClass('warning');
  });
});


describe('アクセシビリティ', () => {
  it('主要な要素にaria-labelやroleが設定されている', async () => {
    render(<App />);

    // メインのヘッダーにrole="heading"がある
    expect(screen.getByRole('heading', { name: /RepeatNote/ })).toBeInTheDocument();

    // 新規追加フォームが展開された際のテキストエリア
    const addButton = screen.getByText('➕ 新しいアイテムを追加');
    const user = userEvent.setup();
    await user.click(addButton);

    expect(screen.getByPlaceholderText('学習内容を入力してください')).toBeInTheDocument();
  });

  it('テキスト検索で絞り込みができる', async () => {
    const user = userEvent.setup();
    render(<App />);
    const searchInput = await screen.findByPlaceholderText('キーワードで絞り込み...');
    await user.type(searchInput, '検索テキスト');
    expect(searchInput).toHaveValue('検索テキスト');
  });

  it('検索クリアボタンで入力がリセットされる', async () => {
    const user = userEvent.setup();
    render(<App />);
    const searchInput = await screen.findByPlaceholderText('キーワードで絞り込み...');
    await user.type(searchInput, 'テスト');
    const clearButton = screen.getByTitle('クリア');
    await user.click(clearButton);
    expect(searchInput).toHaveValue('');
  });
});