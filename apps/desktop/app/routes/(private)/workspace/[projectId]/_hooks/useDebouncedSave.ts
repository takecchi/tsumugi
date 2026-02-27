import { useRef, useCallback } from 'react';

/**
 * debounce 付き保存 hook
 *
 * フィールド単位で独立したタイマーを管理し、
 * 同じフィールドへの連続入力は最後の1回だけ保存する。
 */
export function useDebouncedSave(
  onSave: (field: string, value: unknown) => Promise<void>,
  debounceMs = 500,
) {
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  return useCallback(
    (field: string, value: unknown) => {
      const existing = timers.current.get(field);
      if (existing) clearTimeout(existing);

      timers.current.set(
        field,
        setTimeout(async () => {
          timers.current.delete(field);
          try {
            await onSave(field, value);
          } catch (e) {
            console.error(`Failed to save ${field}:`, e);
          }
        }, debounceMs),
      );
    },
    [onSave, debounceMs],
  );
}
