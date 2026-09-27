import { useEffect, useState } from 'react';
import { getAttachmentUrl } from '../../api';
import { ARTIFACT_SANDBOX } from '../../constants';
import './ArtifactModal.css';

const DEFAULT_TITLE = 'artifact';

interface ArtifactModalProps {
  filename: string | null;
  onClose: () => void;
}

// artifact（HTML）を sandbox iframe でほぼ全画面に表示する。
// 操作中の誤クリックで状態を失わないよう、背景クリックでは閉じない
export function ArtifactModal({ filename, onClose }: ArtifactModalProps) {
  const [title, setTitle] = useState(DEFAULT_TITLE);

  // iframe は別オリジン扱いで中身を読めないため、<title> は別途取得して解析する
  useEffect(() => {
    if (!filename) return;
    setTitle(DEFAULT_TITLE);
    const controller = new AbortController();
    fetch(getAttachmentUrl(filename), { signal: controller.signal })
      .then((res) => (res.ok ? res.text() : ''))
      .then((html) => {
        const parsed = new DOMParser().parseFromString(html, 'text/html').title.trim();
        if (parsed) setTitle(parsed);
      })
      .catch(() => {
        // 中断・取得失敗時は既定のタイトルのまま
      });
    return () => controller.abort();
  }, [filename]);

  // フォーカスが iframe の外にあるときだけ ESC で閉じる（iframe 内のキー入力は親に届かない）
  useEffect(() => {
    if (!filename) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filename, onClose]);

  if (!filename) return null;

  return (
    <div className="artifact-modal-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="artifact-modal-content">
        <div className="artifact-modal-header">
          <span className="artifact-modal-title">🧩 {title}</span>
          <button className="artifact-modal-close" onClick={onClose} title="閉じる" aria-label="閉じる">
            ✕
          </button>
        </div>
        <iframe
          className="artifact-modal-frame"
          src={getAttachmentUrl(filename)}
          sandbox={ARTIFACT_SANDBOX}
          title={title}
        />
      </div>
    </div>
  );
}
