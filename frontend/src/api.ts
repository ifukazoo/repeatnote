import type {
  AttachmentChanges,
  AttachmentKind,
  Item,
  CreateItemData,
  UpdateItemData,
  ItemsResponse,
  ItemResponse,
} from './types';

const API_BASE = '/api';

export function getAttachmentUrl(filename: string): string {
  return `${API_BASE}/attachments/${encodeURIComponent(filename)}`;
}

// サーバーの規約: 添付のフィールド名は種別名（image）、削除は removeImage のように指定する
function removeFieldName(kind: AttachmentKind): string {
  return `remove${kind[0].toUpperCase()}${kind.slice(1)}`;
}

// 添付の変更が1件でもあれば multipart、なければ null（JSON で送る）
function buildItemFormData(content: string, changes: AttachmentChanges): FormData | null {
  const entries = Object.entries(changes) as [AttachmentKind, AttachmentChanges[AttachmentKind]][];
  if (!entries.some(([, change]) => change?.file || change?.remove)) return null;

  const formData = new FormData();
  formData.append('content', content);
  for (const [kind, change] of entries) {
    if (change?.file) formData.append(kind, change.file);
    if (change?.remove) formData.append(removeFieldName(kind), 'true');
  }
  return formData;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: { message: 'Unknown error' } }));
    const message = errorData.error?.message || `HTTP ${response.status}`;
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

async function apiRequestFormData<T>(
  url: string,
  formData: FormData,
  method: string = 'POST',
): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    method,
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: { message: 'Unknown error' } }));
    const message = errorData.error?.message || `HTTP ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return response.json();
}

export async function getItems(): Promise<Item[]> {
  const response = await apiRequest<ItemsResponse>('/items');
  return response.items;
}

export async function createItem(data: CreateItemData): Promise<Item> {
  const changes: AttachmentChanges = {};
  for (const [kind, file] of Object.entries(data.files ?? {}) as [AttachmentKind, File][]) {
    changes[kind] = { file };
  }
  const formData = buildItemFormData(data.content, changes);
  if (formData) {
    const response = await apiRequestFormData<ItemResponse>('/items', formData);
    return response.item;
  }
  const response = await apiRequest<ItemResponse>('/items', {
    method: 'POST',
    body: JSON.stringify({ content: data.content }),
  });
  return response.item;
}

export async function updateItem(id: string, data: UpdateItemData): Promise<Item> {
  const formData = buildItemFormData(data.content, data.changes ?? {});
  if (formData) {
    const response = await apiRequestFormData<ItemResponse>(`/items/${id}`, formData, 'PUT');
    return response.item;
  }
  const response = await apiRequest<ItemResponse>(`/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ content: data.content }),
  });
  return response.item;
}

export async function reviewItem(id: string, quality: number): Promise<Item> {
  const response = await apiRequest<ItemResponse>(`/items/${id}/review`, {
    method: 'PUT',
    body: JSON.stringify({ quality }),
  });
  return response.item;
}

export async function deleteItem(id: string): Promise<void> {
  await apiRequest<void>(`/items/${id}`, { method: 'DELETE' });
}

export async function masterItem(id: string): Promise<Item> {
  const response = await apiRequest<ItemResponse>(`/items/${id}/master`, { method: 'PUT' });
  return response.item;
}

export async function unmasterItem(id: string): Promise<Item> {
  const response = await apiRequest<ItemResponse>(`/items/${id}/unmaster`, { method: 'PUT' });
  return response.item;
}
