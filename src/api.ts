// API通信関数
import type { Item, CreateItemData, ItemsResponse, ItemResponse, MessageResponse } from './types';

const API_BASE = '/api';

// APIエラーハンドリング
export class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
        this.name = 'ApiError';
    }
}

// 共通のfetch処理
async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${url}`, {
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
        ...options,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new ApiError(response.status, errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
}

// アイテム一覧取得
export async function getItems(): Promise<Item[]> {
    const response = await apiRequest<ItemsResponse>('/items');
    return response.items;
}

// 新しいアイテム作成
export async function createItem(data: CreateItemData): Promise<Item> {
    const response = await apiRequest<ItemResponse>('/items', {
        method: 'POST',
        body: JSON.stringify(data),
    });
    return response.item;
}

// アイテム復習処理
export async function reviewItem(id: number, quality: number): Promise<Item> {
    const response = await apiRequest<ItemResponse>(`/items/${id}/review`, {
        method: 'PUT',
        body: JSON.stringify({ quality }),
    });
    return response.item;
}

// アイテム削除
export async function deleteItem(id: number): Promise<void> {
    await apiRequest<MessageResponse>(`/items/${id}`, {
        method: 'DELETE',
    });
}
