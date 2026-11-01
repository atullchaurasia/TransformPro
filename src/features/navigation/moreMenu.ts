import type { IconName } from '@/components';
import { brand } from '@/theme';

export type MoreItemKey =
  | 'plans'
  | 'personalTraining'
  | 'services'
  | 'staff'
  | 'branches'
  | 'enquiries'
  | 'messages'
  | 'referrals'
  | 'expenses'
  | 'reports'
  | 'backup'
  | 'importMembers'
  | 'exportData'
  | 'trash'
  | 'activityLog'
  | 'settings'
  | 'cardDesign'
  | 'language'
  | 'theme'
  | 'lockNow'
  | 'switchUser'
  | 'help';

export type MoreItem = {
  key: MoreItemKey;
  icon: IconName;
  color: string;
  /** Milestone that builds the screen; null = works now (handled on the More screen). */
  milestone: string | null;
};

export type MoreGroup = { key: 'gym' | 'growth' | 'money' | 'data' | 'app'; items: MoreItem[] };

// Groups and items exactly as spec §9. Each milestone flips its `milestone` to null and
// wires a real route when it builds the screen (roadmap Wire-up register: "More-menu items").
export const MORE_MENU: MoreGroup[] = [
  {
    key: 'gym',
    items: [
      { key: 'plans', icon: 'pricetags', color: brand.primary, milestone: null },
      { key: 'personalTraining', icon: 'barbell', color: '#DB2777', milestone: null },
      { key: 'services', icon: 'sparkles', color: '#0891B2', milestone: null },
      { key: 'staff', icon: 'people-circle', color: brand.info, milestone: 'M19' },
      { key: 'branches', icon: 'business', color: '#4F46E5', milestone: 'M19' },
    ],
  },
  {
    key: 'growth',
    items: [
      { key: 'enquiries', icon: 'chatbubbles', color: '#9333EA', milestone: 'M16' },
      { key: 'messages', icon: 'logo-whatsapp', color: brand.success, milestone: 'M14' },
      { key: 'referrals', icon: 'gift', color: '#CA8A04', milestone: 'M16' },
    ],
  },
  {
    key: 'money',
    items: [
      { key: 'expenses', icon: 'receipt', color: brand.warning, milestone: 'M17' },
      { key: 'reports', icon: 'bar-chart', color: brand.info, milestone: 'M18' },
    ],
  },
  {
    key: 'data',
    items: [
      { key: 'backup', icon: 'cloud-download', color: brand.success, milestone: null },
      { key: 'importMembers', icon: 'document-attach', color: '#0891B2', milestone: null },
      { key: 'exportData', icon: 'share', color: '#4F46E5', milestone: null },
      { key: 'trash', icon: 'trash', color: brand.danger, milestone: null },
      { key: 'activityLog', icon: 'list', color: brand.slate, milestone: 'M19' },
    ],
  },
  {
    key: 'app',
    items: [
      { key: 'settings', icon: 'settings', color: '#64748B', milestone: 'M20' },
      { key: 'cardDesign', icon: 'card', color: brand.primary, milestone: 'M13' },
      { key: 'language', icon: 'language', color: brand.info, milestone: null },
      { key: 'theme', icon: 'contrast', color: brand.slate, milestone: null },
      { key: 'lockNow', icon: 'lock-closed', color: brand.danger, milestone: null },
      { key: 'switchUser', icon: 'swap-horizontal', color: '#9333EA', milestone: null },
      { key: 'help', icon: 'help-circle', color: '#0891B2', milestone: 'M20' },
    ],
  },
];
