/**
 * キーボードイベントが IME（入力メソッド）による処理中かどうかを判定する。
 * isComposing だけでは Chromium 系（Tauri/WebView2 含む）で
 * compositionEnd → keydown の発火順序により信頼できないため、
 * keyCode === 229 も併用する。
 */
export function isIMEActive(e: KeyboardEvent | { nativeEvent: KeyboardEvent }): boolean {
  const nativeEvent = 'nativeEvent' in e ? e.nativeEvent : e;
  return nativeEvent.isComposing || nativeEvent.keyCode === 229;
}
