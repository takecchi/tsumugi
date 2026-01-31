'use client';

import React from 'react';
import { Links, Meta } from 'react-router';

/**
 * React Router v7 の SPA モード + dev サーバーで、
 * 初回ロード時に FrameworkContext が未初期化のまま
 * Meta / Links がレンダリングされてエラーになる問題を回避するラッパー。
 *
 * FrameworkContext が利用できない場合はフォールバック（空）を返す。
 * build 時は問題なく動作するため、dev 時のみの安全策。
 */

export class SafeErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * `<Meta />` のセーフラッパー。
 * FrameworkContext が未初期化の場合は charset と viewport のみ出力する。
 */
export function SafeMeta() {
  return (
    <SafeErrorBoundary
      fallback={
        <>
          <meta charSet="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
        </>
      }
    >
      <Meta />
    </SafeErrorBoundary>
  );
}

/**
 * `<Links />` のセーフラッパー。
 * FrameworkContext が未初期化の場合は何も出力しない。
 */
export function SafeLinks(props: { nonce?: string }) {
  return (
    <SafeErrorBoundary fallback={null}>
      <Links {...props} />
    </SafeErrorBoundary>
  );
}
