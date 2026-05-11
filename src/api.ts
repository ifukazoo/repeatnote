import type {
  Item,
  CreateItemData,
  UpdateItemData,
  ItemsResponse,
  ItemResponse,
} from './types';

const API_BASE = 'http://localhost:3001/api';

export function getImageUrl(filename: string): string {
  return `${API_BASE}/images/${filename}`;
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
  if (data.image) {
    const formData = new FormData();
    formData.append('content', data.content);
    formData.append('image', data.image);
    const response = await apiRequestFormData<ItemResponse>('/items', formData);
    return response.item;
  } else {
    const response = await apiRequest<ItemResponse>('/items', {
      method: 'POST',
      body: JSON.stringify({ content: data.content }),
    });
    return response.item;
  }
}

export async function updateItem(id: string, data: UpdateItemData): Promise<Item> {
  if (data.image || data.removeImage) {
    const formData = new FormData();
    formData.append('content', data.content);
    if (data.image) formData.append('image', data.image);
    if (data.removeImage) formData.append('removeImage', 'true');
    const response = await apiRequestFormData<ItemResponse>(`/items/${id}`, formData, 'PUT');
    return response.item;
  } else {
    const response = await apiRequest<ItemResponse>(`/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ content: data.content }),
    });
    return response.item;
  }
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
