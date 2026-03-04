import type { ExportAdapter, ExportOptions } from '@tsumugi/adapter';
import type { ApiClients } from '@/client';

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function extractFilename(headers: Headers): string {
  const disposition = headers.get('Content-Disposition');
  if (disposition) {
    const rfcMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (rfcMatch) return decodeURIComponent(rfcMatch[1]);
    const match = disposition.match(/filename="?([^";\n]+)"?/i);
    if (match) return match[1].trim();
  }
  return 'export.zip';
}

export function createExportAdapter(clients: ApiClients): ExportAdapter {
  return {
    async exportProject(
      projectId: string,
      _options?: ExportOptions,
    ): Promise<void> {
      const response = await clients.projects.exportProjectRaw({ projectId });
      const blob = await response.raw.blob();
      const filename = extractFilename(response.raw.headers);
      triggerBrowserDownload(blob, filename);
    },
  };
}
