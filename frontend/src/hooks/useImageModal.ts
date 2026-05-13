import { useState, useEffect } from 'react';

export function useImageModal() {
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [modalImageSrc, setModalImageSrc] = useState<string>('');

  const openImageModal = (imageSrc: string) => {
    setModalImageSrc(imageSrc);
    setImageModalOpen(true);
  };

  const closeImageModal = () => {
    setImageModalOpen(false);
    setModalImageSrc('');
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeImageModal();
      }
    };

    if (imageModalOpen) {
      document.addEventListener('keydown', handleKeyPress);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [imageModalOpen]);

  return { imageModalOpen, modalImageSrc, openImageModal, closeImageModal };
}
