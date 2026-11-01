import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Avatar, Button, Icon, Input, type IconName } from '@/components';
import { formatPaise } from '@/domain/money';
import { useCan } from '@/features/auth/permissions';
import { useMemberLabels } from '@/features/members/useMemberLabels';
import { resolvePhotoUri } from '@/services/photos';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';
import { formatTime } from '@/utils/format';

import type { CheckinFlow, CheckinResult } from './useCheckinFlow';

export type CheckinResultCardProps = {
  result: CheckinResult;
  flow: CheckinFlow;
  method: 'qr' | 'search';
  /** Kiosk: no Renew / Override — members use it unattended. */
  kiosk?: boolean;
};

/** ✅ green · ⚠️ orange · ⛔ red result for a check-in (§10.4). */
export function CheckinResultCard({ result, flow, method, kiosk = false }: CheckinResultCardProps) {
  const { t } = useTranslation();
  const { colors, spacing, radius } = useTheme();
  const { currency_code, language } = useSettings();
  const labels = useMemberLabels();
  const canRenew = useCan('membership.renew');
  const [reason, setReason] = useState<string | null>(null);

  const warnings = result.kind === 'checked_in' && result.check.decision.kind === 'check_in' ? result.check.decision.warnings : [];
  const tone =
    result.kind === 'blocked' || result.kind === 'error' ? colors.danger : result.kind === 'checked_in' ? (warnings.length || result.overridden ? colors.warning : colors.success) : colors.info;
  const icon: IconName = result.kind === 'blocked' || result.kind === 'error' ? 'close-circle' : result.kind === 'checked_in' ? (warnings.length ? 'warning' : 'checkmark-circle') : 'log-out-outline';
  const time = (iso: string) => formatTime(iso, language);

  const check = result.kind === 'error' ? null : result.check;
  const m = check?.membership;
  const headline =
    result.kind === 'checked_in'
      ? t('checkin.result.checkedIn', { time: time(result.at) })
      : result.kind === 'checked_out'
        ? t('checkin.result.checkedOut', { time: time(result.at) })
        : result.kind === 'inside'
          ? t('checkin.result.inside', { time: check?.openVisit ? time(check.openVisit.checkInAt) : '' })
          : result.kind === 'blocked'
            ? t('checkin.result.blocked')
            : t(`checkin.result.error.${result.reason}`);
  const lines = [
    ...warnings.map((w) => (w === 'dues' ? t('checkin.warning.dues', { amount: formatPaise(check?.duePaise ?? 0, currency_code) }) : t(`checkin.warning.${w}`))),
    ...(result.kind === 'blocked' && result.check.decision.kind === 'blocked' ? result.check.decision.reasons.map((r) => (r === 'dues' ? t('checkin.reason.dues', { amount: formatPaise(result.check.duePaise, currency_code) }) : t(`checkin.reason.${r}`))) : []),
    ...(result.kind === 'checked_in' && result.overridden ? [t('checkin.result.overridden')] : []),
  ];
  const overridable = result.kind === 'blocked' && result.check.decision.kind === 'blocked' && result.check.decision.overridable && !kiosk;

  return (
    <View style={{ backgroundColor: colors.surfaceElevated, borderRadius: radius.xl, borderWidth: 3, borderColor: tone, padding: spacing.lg, gap: spacing.md }} accessibilityLiveRegion="assertive">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        {check ? <Avatar name={check.member.fullName} uri={resolvePhotoUri(check.member.photoUri)} size={72} /> : <Icon name={icon} size={64} color={tone} />}
        <View style={{ flex: 1, gap: 2 }}>
          {check ? <AppText variant="title2" numberOfLines={2}>{check.member.fullName}</AppText> : null}
          {check && m ? (
            <AppText variant="subhead" tone="secondary" numberOfLines={2}>
              {[check.member.memberCode, m.planName, labels.timing({ status: m.status, daysLeft: m.daysLeft, daysSinceExpiry: m.daysSinceExpiry, expiryDate: m.coveredUntil }), m.sessionsLeft != null ? t('profile.sessionsLeft', { count: m.sessionsLeft }) : null]
                .filter(Boolean)
                .join(' · ')}
            </AppText>
          ) : null}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        {check ? <Icon name={icon} size={28} color={tone} /> : null}
        <AppText variant="title3" style={{ color: tone, flex: 1 }}>
          {headline}
        </AppText>
      </View>
      {lines.map((l) => (
        <AppText key={l} variant="subhead">
          {l}
        </AppText>
      ))}

      {result.kind === 'blocked' && kiosk ? <AppText variant="subhead" tone="secondary">{t('checkin.result.seeDesk')}</AppText> : null}
      {result.kind === 'inside' ? <Button label={t('checkin.checkOut')} icon="log-out-outline" onPress={() => void flow.checkOut()} loading={flow.busy} fullWidth /> : null}
      {result.kind === 'blocked' && !kiosk && reason === null ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {canRenew ? (
            <Button
              label={t('members.actions.renew')}
              icon="refresh"
              onPress={() => {
                flow.dismiss();
                router.push({ pathname: '/member/[id]/renew', params: { id: result.check.member.id, mode: 'renew' } });
              }}
              style={{ flex: 1 }}
            />
          ) : null}
          {overridable ? <Button label={t('checkin.override')} icon="key-outline" variant="secondary" onPress={() => setReason('')} style={{ flex: 1 }} /> : null}
        </View>
      ) : null}
      {reason !== null ? (
        <View style={{ gap: spacing.sm }}>
          <Input label={t('checkin.overrideReason')} required value={reason} onChangeText={setReason} autoFocus maxLength={200} />
          <Button label={t('checkin.overrideConfirm')} variant="destructive" disabled={!reason.trim()} loading={flow.busy} onPress={() => void flow.override(reason, method)} fullWidth />
        </View>
      ) : null}
      {result.kind === 'blocked' || result.kind === 'inside' ? <Button label={t('common.close')} variant="ghost" onPress={flow.dismiss} fullWidth /> : null}
    </View>
  );
}
