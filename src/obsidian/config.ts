const BASE_URL = 'https://127.0.0.1:27123';
const VAULT_FOLDER = 'repeatnote';
const API_KEY_STORAGE_KEY = 'obsidian_api_key';

export function getApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE_KEY) ?? '';
}

export function setApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
}

export function getBaseUrl(): string {
  return BASE_URL;
}

export function getVaultFolder(): string {
  return VAULT_FOLDER;
}

export function getVaultPath(relativePath: string = ''): string {
  return `${BASE_URL}/vault/${VAULT_FOLDER}/${relativePath}`;
}
