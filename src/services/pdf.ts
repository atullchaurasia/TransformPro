// PDF files from HTML (expo-print) and sharing them (expo-sharing) — spec §10.5. Native calls
// are wrapped so a missing capability gives a friendly result instead of a crash (§2).
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { logger } from '@/utils/logger';

import { resolvePhotoUri } from './photos';

/** Page sizes in points (72 per inch) — expo-print's width/height units. */
export const PAGE_SIZES = { A4: { width: 595, height: 842 }, A5: { width: 420, height: 595 } } as const;
export type PageSize = keyof typeof PAGE_SIZES;

export type PdfResult = { ok: true; uri: string } | { ok: false; reason: 'storage' | 'failed' };

const safeName = (name: string) => name.replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 80) || 'document';

/** Renders HTML to a PDF in the cache folder, named `<fileName>.pdf` so it shares nicely. */
export async function htmlToPdf(html: string, size: PageSize, fileName: string): Promise<PdfResult> {
  try {
    const { uri } = await Print.printToFileAsync({ html, ...PAGE_SIZES[size] });
    const target = new File(Paths.cache, `${safeName(fileName)}.pdf`);
    if (target.exists) target.delete();
    await new File(uri).move(target);
    return { ok: true, uri: target.uri };
  } catch (e) {
    logger.warn('PDF creation failed', e);
    return { ok: false, reason: /space|ENOSPC|full/i.test(String(e)) ? 'storage' : 'failed' };
  }
}

/** Opens the iOS share sheet (WhatsApp, Mail, Files, Print…). */
export async function shareFile(uri: string, mimeType: string, uti: string): Promise<'shared' | 'unavailable'> {
  try {
    if (!(await Sharing.isAvailableAsync())) return 'unavailable';
    await Sharing.shareAsync(uri, { mimeType, UTI: uti });
    return 'shared';
  } catch (e) {
    logger.warn('Sharing failed', e);
    return 'unavailable';
  }
}

export const sharePdf = (uri: string) => shareFile(uri, 'application/pdf', 'com.adobe.pdf');

/** AirPrint. Closing the print dialog rejects in expo-print — that's not an error for us. */
export async function printPdf(uri: string): Promise<void> {
  try {
    await Print.printAsync({ uri });
  } catch (e) {
    logger.info('Print closed or failed', e);
  }
}

/**
 * WKWebView can't load local files in print HTML, so the logo is inlined as a data: URI
 * (expo-print docs). Returns null when there's no logo or it can't be read.
 */
export async function imageDataUri(path: string | null): Promise<string | null> {
  const uri = resolvePhotoUri(path);
  if (!uri) return null;
  try {
    const file = new File(uri);
    if (!file.exists) return null;
    return `data:image/jpeg;base64,${await file.base64()}`;
  } catch (e) {
    logger.warn('Reading image for PDF failed', e);
    return null;
  }
}
