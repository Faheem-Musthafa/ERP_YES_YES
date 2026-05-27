import { useEffect, useState } from 'react';

/**
 * Returns true while the document is visible (`visibilityState === 'visible'`).
 * Lets background tabs skip wasted polling work.
 */
export function useDocumentVisibility(): boolean {
  const [visible, setVisible] = useState(
    typeof document === 'undefined' ? true : document.visibilityState === 'visible',
  );
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onChange = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return visible;
}
