import type { ExportResult } from '@tsumugi/adapter';

/**
 * ExportResult をブラウザのダウンロードとして保存する
 */
export function downloadExportResult(result: ExportResult): void {
  const blob = new Blob([result.data], { type: result.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
