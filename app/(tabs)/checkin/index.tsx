import { router, Stack, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, ErrorState, SegmentedControl } from '@/components';
import { useCan } from '@/features/auth/permissions';
import { KioskExitPanel } from '@/features/checkin/KioskExitPanel';
import { ScanToolbar } from '@/features/checkin/ScanToolbar';
import { ScannerView } from '@/features/checkin/ScannerView';
import { SearchMarkView } from '@/features/checkin/SearchMarkView';
import { TodayListView } from '@/features/checkin/TodayListView';
import { useCheckinFlow } from '@/features/checkin/useCheckinFlow';
import { HeaderIconButton } from '@/features/navigation/HeaderIconButton';
import { useKioskStore } from '@/store/kioskStore';
import { useTheme } from '@/theme';

type Mode = 'scan' | 'search' | 'today';

/** Keeps the iPad awake while the kiosk is on (§10.4). Mounted only in kiosk mode. */
function KeepAwake() {
  useKeepAwake('kiosk');
  return null;
}

/** Check-in tab (spec §10.4): Scan QR · Search & mark · Today's list, plus kiosk mode. */
export default function CheckinScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const params = useLocalSearchParams<{ memberId?: string; at?: string; view?: string }>();
  const canMark = useCan('attendance.mark');
  const kiosk = useKioskStore((s) => s.active);
  const front = useKioskStore((s) => s.frontCamera);
  const [mode, setMode] = useState<Mode>('scan');
  const [exiting, setExiting] = useState(false);
  const flow = useCheckinFlow({ kiosk });
  const { processMember } = flow;

  // Swipe "Check-in" in Members and the profile button land here with a member (`at` makes each tap new).
  useEffect(() => {
    if (!params.memberId || !canMark) return;
    setMode('search');
    void processMember(params.memberId, 'search');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.memberId, params.at, canMark]);

  // Dashboard "Check-ins today" card opens Today's list.
  useEffect(() => {
    if (params.view === 'today') setMode('today');
  }, [params.view, params.at]);

  if (!canMark) return <ErrorState message={t('auth.noPermission')} />;

  if (kiosk) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <Stack.Screen options={{ headerShown: false }} />
        <KeepAwake />
        <ScannerView flow={flow} active={focused && !exiting} front={front} kiosk />
        <View style={{ position: 'absolute', top: insets.top + spacing.sm, right: spacing.lg }}>
          <Button label={t('checkin.kiosk.exit')} icon="lock-closed" variant="secondary" size="sm" onPress={() => setExiting(true)} />
        </View>
        {exiting ? (
          <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.backdrop }]}>
            <KioskExitPanel onCancel={() => setExiting(false)} />
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, gap: spacing.md, paddingTop: spacing.sm }}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerLargeTitleEnabled: false,
          headerRight: () => (
            <View style={{ flexDirection: 'row' }}>
              <HeaderIconButton icon="calendar-outline" accessibilityLabel={t('checkin.history.title')} onPress={() => router.push('/checkin/history')} />
              <HeaderIconButton icon="person-remove-outline" accessibilityLabel={t('checkin.absentees.title')} onPress={() => router.push('/checkin/absentees')} />
            </View>
          ),
        }}
      />
      <View style={{ paddingHorizontal: spacing.lg }}>
        <SegmentedControl<Mode>
          value={mode}
          onChange={(m) => {
            flow.dismiss();
            setMode(m);
          }}
          options={[
            { value: 'scan', label: t('checkin.mode.scan') },
            { value: 'search', label: t('checkin.mode.search') },
            { value: 'today', label: t('checkin.mode.today') },
          ]}
        />
      </View>
      {mode === 'scan' ? (
        <>
          <ScanToolbar />
          <View style={{ flex: 1, paddingBottom: spacing.md }}>
            <ScannerView flow={flow} active={focused} front={front} kiosk={false} />
          </View>
        </>
      ) : mode === 'search' ? (
        <SearchMarkView flow={flow} />
      ) : (
        <TodayListView />
      )}
    </View>
  );
}
