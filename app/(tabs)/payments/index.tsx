import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ErrorState, SegmentedControl } from '@/components';
import { useCan } from '@/features/auth/permissions';
import { HeaderIconButton } from '@/features/navigation/HeaderIconButton';
import { CollectionsView } from '@/features/payments/CollectionsView';
import { DuesView } from '@/features/payments/DuesView';
import { useTheme } from '@/theme';

type Segment = 'collections' | 'dues' | 'refunds';

/** Payments tab (spec §10.5): Collections · Dues · Refunds. */
export default function PaymentsScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const canView = useCan('payments.view');
  const canCreate = useCan('payments.create');
  const canRefund = useCan('payments.refund');
  const [segment, setSegment] = useState<Segment>('collections');

  const header = (
    <Stack.Screen
      options={{
        headerLargeTitleEnabled: false,
        headerRight: () =>
          segment === 'refunds'
            ? canRefund
              ? <HeaderIconButton icon="return-down-back-outline" accessibilityLabel={t('payments.refund.title')} onPress={() => router.push('/payment/refund')} />
              : null
            : canCreate
              ? <HeaderIconButton icon="add" accessibilityLabel={t('quickActions.recordPayment')} onPress={() => router.push('/payment/new')} />
              : null,
      }}
    />
  );
  if (!canView) return <>{header}<ErrorState message={t('auth.noPermission')} /></>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {header}
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm }}>
        <SegmentedControl<Segment>
          value={segment}
          onChange={setSegment}
          options={[
            { value: 'collections', label: t('payments.segment.collections') },
            { value: 'dues', label: t('payments.segment.dues') },
            { value: 'refunds', label: t('payments.segment.refunds') },
          ]}
        />
      </View>
      <View style={{ flex: 1 }}>
        {segment === 'collections' ? <CollectionsView kind="payments" /> : segment === 'dues' ? <DuesView /> : <CollectionsView kind="refunds" />}
      </View>
    </View>
  );
}
