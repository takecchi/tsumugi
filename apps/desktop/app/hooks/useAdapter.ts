import { useContext } from 'react';
import type { Adapter } from '@tsumugi/adapter';
import { AdapterContext } from '~/adapter-provider';

export function useAdapter(): Adapter {
  const adapter = useContext(AdapterContext);
  if (!adapter) {
    throw new Error('useAdapter must be used within an AdapterProvider');
  }
  return adapter;
}
