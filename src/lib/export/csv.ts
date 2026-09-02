import { UrlCheckResult } from '../types';

/**
 * Escapes a cell value for RFC 4180 CSV standard.
 */
function escapeCsvCell(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Generates an RFC 4180 CSV string from URL check results.
 */
export function generateCsv(results: UrlCheckResult[]): string {
  const headers = ['URL', 'Google Status', 'HTTP Status', 'Canonical', 'Sitemap', 'Last Modified', 'Checked At'];
  const lines: string[] = [headers.map(escapeCsvCell).join(',')];

  for (const item of results) {
    const row = [
      item.url,
      item.googleStatus,
      item.httpStatus ? item.httpStatus.toString() : 'N/A',
      item.canonicalStatus === 'SELF'
        ? 'Self'
        : item.canonicalUrl
        ? item.canonicalUrl
        : item.canonicalStatus || 'N/A',
      item.sitemapSource || 'Direct Input',
      item.lastModified || 'N/A',
      item.checkedAt || new Date().toISOString(),
    ];
    lines.push(row.map(escapeCsvCell).join(','));
  }

  return lines.join('\r\n');
}

/**
 * Triggers a browser download of the CSV content.
 */
export function downloadCsvFile(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copies a list of URLs to the clipboard formatted with one URL per line.
 */
export async function copyUrlsToClipboard(urls: string[]): Promise<boolean> {
  try {
    const text = urls.join('\n');
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = urls.join('\n');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}
