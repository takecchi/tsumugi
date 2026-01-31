import type { ContentType } from '@tsumugi/adapter';

/** 個別コンテンツの SWR キー */
export interface ContentItemKey<T extends ContentType = ContentType> {
  type: T;
  id: string;
}

/** コンテンツツリーの SWR キー */
export interface ContentTreeKey<T extends ContentType = ContentType> {
  type: `${T}Tree`;
  projectId: string;
}
