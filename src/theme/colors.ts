// Brand + semantic colour tokens (spec §12). Components must use these via useTheme(),
// never hardcoded hex values.

export const brand = {
  primary: '#FF6B2C',
  slate: '#1E293B',
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',
  info: '#2563EB',
  /** WhatsApp's own green, for WhatsApp buttons only. */
  whatsapp: '#25D366',
} as const;

export type ThemeColors = {
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  onPrimary: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;
  border: string;
  separator: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;
  backdrop: string;
  skeleton: string;
  tabBar: string;
  status: Record<StatusTone, { fg: string; bg: string }>;
};

/** Membership status colours (spec §12): Active green, Expiring amber, In grace orange,
 * Expired red, Frozen blue, Upcoming purple, No plan gray. */
export type StatusTone =
  | 'active'
  | 'expiring'
  | 'grace'
  | 'expired'
  | 'frozen'
  | 'upcoming'
  | 'noPlan';

export const lightColors: ThemeColors = {
  primary: brand.primary,
  primaryPressed: '#E85A1E',
  primarySoft: '#FFEDE4',
  onPrimary: '#FFFFFF',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  border: '#E2E8F0',
  separator: '#E5E5EA',
  text: brand.slate,
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',
  success: brand.success,
  successSoft: '#DCFCE7',
  warning: brand.warning,
  warningSoft: '#FEF3C7',
  danger: brand.danger,
  dangerSoft: '#FEE2E2',
  info: brand.info,
  infoSoft: '#DBEAFE',
  backdrop: 'rgba(15, 23, 42, 0.45)',
  skeleton: '#E2E8F0',
  tabBar: '#FFFFFF',
  status: {
    active: { fg: '#15803D', bg: '#DCFCE7' },
    expiring: { fg: '#B45309', bg: '#FEF3C7' },
    grace: { fg: '#C2410C', bg: '#FFEDD5' },
    expired: { fg: '#B91C1C', bg: '#FEE2E2' },
    frozen: { fg: '#1D4ED8', bg: '#DBEAFE' },
    upcoming: { fg: '#7E22CE', bg: '#F3E8FF' },
    noPlan: { fg: '#475569', bg: '#F1F5F9' },
  },
};

export const darkColors: ThemeColors = {
  primary: '#FF7A3F',
  primaryPressed: '#FF6B2C',
  primarySoft: '#3A2116',
  onPrimary: '#FFFFFF',
  background: '#000000',
  surface: '#1C1C1E',
  surfaceElevated: '#2C2C2E',
  surfaceMuted: '#2C2C2E',
  border: '#38383A',
  separator: '#38383A',
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textTertiary: '#64748B',
  textInverse: '#0F172A',
  success: '#22C55E',
  successSoft: '#14301F',
  warning: '#FBBF24',
  warningSoft: '#3A2E10',
  danger: '#F87171',
  dangerSoft: '#3B1717',
  info: '#60A5FA',
  infoSoft: '#172A46',
  backdrop: 'rgba(0, 0, 0, 0.6)',
  skeleton: '#2C2C2E',
  tabBar: '#1C1C1E',
  status: {
    active: { fg: '#4ADE80', bg: '#14301F' },
    expiring: { fg: '#FBBF24', bg: '#3A2E10' },
    grace: { fg: '#FB923C', bg: '#3A2412' },
    expired: { fg: '#F87171', bg: '#3B1717' },
    frozen: { fg: '#60A5FA', bg: '#172A46' },
    upcoming: { fg: '#C084FC', bg: '#2E1A40' },
    noPlan: { fg: '#94A3B8', bg: '#2C2C2E' },
  },
};

/** Palette for initials avatars and plan colour badges. */
export const accentPalette = [
  '#FF6B2C',
  '#2563EB',
  '#16A34A',
  '#9333EA',
  '#DB2777',
  '#0891B2',
  '#CA8A04',
  '#4F46E5',
] as const;
