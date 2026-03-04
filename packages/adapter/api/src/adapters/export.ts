import type {
  ExportAdapter,
  ExportOptions,
  ExportResult,
} from '@tsumugi/adapter';
import type { ApiClients } from '@/client';

function parseFilename(contentDisposition: string | null): string {
  if (!contentDisposition) return 'export.zip';

  // RFC 5987 形式: filename*=UTF-8''...
  const rfcMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (rfcMatch) {
    return decodeURIComponent(rfcMatch[1]);
  }

  // fallback: filename="..."
  const match = contentDisposition.match(/filename="?([^";\n]+)"?/i);
  return match ? match[1].trim() : 'export.zip';
}

export function createExportAdapter(clients: ApiClients): ExportAdapter {
  return {
    async exportProject(
      projectId: string,
      _options?: ExportOptions,
    ): Promise<ExportResult> {
      const response = await clients.projects.exportProjectRaw({ projectId });
      const buffer = await response.raw.arrayBuffer();
      const filename = parseFilename(
        response.raw.headers.get('Content-Disposition'),
      );
      return {
        data: new Uint8Array(buffer),
        filename,
        mimeType: 'application/zip',
      };
    },
  };
}
