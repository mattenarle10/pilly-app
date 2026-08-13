import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { exportDoseRecordsCsv, exportPlanHtml, type PillyExport } from '@/models/export';

export type ExportFileKind = 'json' | 'csv' | 'pdf';

export async function sharePillyExport(data: PillyExport, kind: ExportFileKind): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }

  if (kind === 'pdf') {
    const { uri } = await Print.printToFileAsync({ html: exportPlanHtml(data) });
    const file = new File(uri);
    try {
      await Sharing.shareAsync(uri, {
        UTI: 'com.adobe.pdf',
        mimeType: 'application/pdf',
        dialogTitle: 'Share Pilly medicine plan',
      });
    } finally {
      deleteExportFile(file);
    }
    return;
  }

  const file = new File(Paths.cache, exportFileName(kind, new Date(data.exportedAt)));
  if (file.exists) file.delete();
  try {
    file.create();
    file.write(kind === 'json' ? JSON.stringify(data, null, 2) : exportDoseRecordsCsv(data));
    await Sharing.shareAsync(file.uri, {
      UTI: kind === 'json' ? 'public.json' : 'public.comma-separated-values-text',
      mimeType: kind === 'json' ? 'application/json' : 'text/csv',
      dialogTitle: kind === 'json' ? 'Share Pilly data' : 'Share Pilly dose history',
    });
  } finally {
    deleteExportFile(file);
  }
}

function deleteExportFile(file: File): void {
  try {
    if (file.exists) file.delete();
  } catch {
    // Export files live only in cache. A cleanup failure must not replace the share result.
  }
}

function exportFileName(kind: Exclude<ExportFileKind, 'pdf'>, date: Date): string {
  const stamp = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => `${part}`.padStart(2, '0'))
    .join('-');
  return `pilly-export-${stamp}.${kind}`;
}
