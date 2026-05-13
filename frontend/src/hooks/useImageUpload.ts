import { useState, useRef, useEffect } from 'react';
import { IMAGE_CONFIG } from '../constants';
import type { AllowedImageType } from '../constants';

function validateImageFile(file: File): { isValid: boolean; error?: string } {
  if (!IMAGE_CONFIG.ALLOWED_TYPES.includes(file.type as AllowedImageType)) {
    return { isValid: false, error: IMAGE_CONFIG.ERROR_MESSAGES.INVALID_TYPE };
  }
  if (file.size > IMAGE_CONFIG.MAX_SIZE) {
    return { isValid: false, error: IMAGE_CONFIG.ERROR_MESSAGES.FILE_TOO_LARGE };
  }
  return { isValid: true };
}

export function useImageUpload(onError: (message: string) => void) {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagePreviewRef = useRef<string | null>(null);

  useEffect(() => {
    imagePreviewRef.current = imagePreview;
  }, [imagePreview]);

  // クリーンアップ：アンマウント時にプレビューURLを解放
  useEffect(() => {
    return () => {
      if (imagePreviewRef.current) {
        URL.revokeObjectURL(imagePreviewRef.current);
      }
    };
  }, []);

  const setImageWithPreview = (file: File) => {
    if (imagePreviewRef.current) {
      URL.revokeObjectURL(imagePreviewRef.current);
    }
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (imagePreviewRef.current) {
      URL.revokeObjectURL(imagePreviewRef.current);
    }
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      onError(validation.error!);
      return;
    }
    setImageWithPreview(file);
  };

  const handleClipboardPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const validation = validateImageFile(file);
          if (!validation.isValid) {
            onError(validation.error!);
            return;
          }
          setImageWithPreview(file);
        }
        break;
      }
    }
  };

  return {
    image,
    imagePreview,
    fileInputRef,
    handleImageChange,
    handleClipboardPaste,
    clearImage,
  };
}
