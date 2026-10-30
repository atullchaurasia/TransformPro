// Opens WhatsApp / SMS / Phone with a prefilled message — the user taps send (CLAUDE.md §0.3,
// spec §10.7). Nothing is sent automatically. Phones are stored as digits incl. country code.
import * as Linking from 'expo-linking';

import { logger } from '@/utils/logger';

export type OpenResult = 'opened' | 'unavailable';

async function open(url: string, fallback?: string): Promise<OpenResult> {
  try {
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
      return 'opened';
    }
    if (fallback) {
      await Linking.openURL(fallback);
      return 'opened';
    }
  } catch (e) {
    logger.warn('Opening link failed', url, e);
  }
  return 'unavailable';
}

/** WhatsApp (or WhatsApp Business), falling back to wa.me in the browser. */
export function openWhatsApp(phoneDigits: string, text = '', preferBusiness = false): Promise<OpenResult> {
  const q = `phone=${phoneDigits}&text=${encodeURIComponent(text)}`;
  const web = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(text)}`;
  if (preferBusiness) {
    return open(`whatsapp-business://send?${q}`).then((r) => (r === 'opened' ? r : open(`whatsapp://send?${q}`, web)));
  }
  return open(`whatsapp://send?${q}`, web);
}

export function callPhone(phoneDigits: string): Promise<OpenResult> {
  return open(`tel:+${phoneDigits}`);
}

/** iOS SMS format: `sms:<number>&body=<text>`. */
export function openSms(phoneDigits: string, text = ''): Promise<OpenResult> {
  return open(`sms:+${phoneDigits}${text ? `&body=${encodeURIComponent(text)}` : ''}`);
}

export function openEmail(email: string, subject = '', body = ''): Promise<OpenResult> {
  return open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
}
