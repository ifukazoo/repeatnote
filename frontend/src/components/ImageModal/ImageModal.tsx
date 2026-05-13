import './ImageModal.css';

interface ImageModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
}

export function ImageModal({ isOpen, imageSrc, onClose }: ImageModalProps) {
  if (!isOpen) return null;

  return (
    <div className="image-modal-overlay" onClick={onClose}>
      <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
        <button
          className="image-modal-close"
          onClick={onClose}
          title="閉じる (ESC)"
        >
          ✕
        </button>
        <img src={imageSrc} alt="画像（拡大表示）" className="image-modal-img" />
      </div>
    </div>
  );
}
