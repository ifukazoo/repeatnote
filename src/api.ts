// API通信関数
import type { Item, CreateItemData, UpdateItemData, ItemsResponse, ItemResponse, MessageResponse } from './types';

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

// FormData用のfetch処理（Content-Typeヘッダーを自動設定）
async function apiRequestFormData<T>(url: string, formData: FormData, method: string = 'POST'): Promise<T> {
    const response = await fetch(`${API_BASE}${url}`, {
        method,
        body: formData,
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
    if (data.image) {
        // 画像がある場合はFormDataで送信
        const formData = new FormData();
        formData.append('content', data.content);
        formData.append('image', data.image);

        const response = await apiRequestFormData<ItemResponse>('/items', formData);
        return response.item;
    } else {
        // 画像がない場合は従来のJSON形式
        const response = await apiRequest<ItemResponse>('/items', {
            method: 'POST',
            body: JSON.stringify({ content: data.content }),
        });
        return response.item;
    }
}

// アイテム更新
export async function updateItem(id: number, data: UpdateItemData): Promise<Item> {
    if (data.image || data.removeImage) {
        // 画像がある場合、または画像削除の場合はFormDataで送信
        const formData = new FormData();
        formData.append('content', data.content);

        if (data.image) {
            formData.append('image', data.image);
        }

        if (data.removeImage) {
            formData.append('removeImage', 'true');
        }

        const response = await apiRequestFormData<ItemResponse>(`/items/${id}`, formData, 'PUT');
        return response.item;
    } else {
        // 画像なしの場合は従来のJSON形式
        const response = await apiRequest<ItemResponse>(`/items/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ content: data.content }),
        });
        return response.item;
    }
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
