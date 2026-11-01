import { CameraView, useCameraPermissions } from 'expo-camera';
import { Linking, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, EmptyState } from '@/components';
import { useTheme } from '@/theme';

import { CheckinResultCard } from './CheckinResultCard';
import type { CheckinFlow } from './useCheckinFlow';

export type ScannerViewProps = {
  flow: CheckinFlow;
  /** False when the tab/segment isn't visible — only one camera preview may run (expo-camera). */
  active: boolean;
  front: boolean;
  kiosk: boolean;
};

/** Scan QR (§10.4): camera, QR only; payload `TRANSFORMPRO:<member_code>`. */
export function ScannerView({ flow, active, front, kiosk }: ScannerViewProps) {
  const { t } = useTranslation();
  const { colors, spacing, radius } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  if (!permission.granted) {
    return (
      <EmptyState
        icon="camera-outline"
        title={t('checkin.camera.title')}
        message={permission.canAskAgain ? t('checkin.camera.message') : t('checkin.camera.denied')}
        actionLabel={permission.canAskAgain ? t('checkin.camera.allow') : t('checkin.camera.openSettings')}
        onAction={() => void (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000', overflow: 'hidden', borderRadius: kiosk ? 0 : radius.lg, marginHorizontal: kiosk ? 0 : spacing.lg }}>
      {active ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing={front ? 'front' : 'back'}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          // While a result is on screen nothing new is read; the flow also debounces repeats.
          onBarcodeScanned={flow.result || flow.busy ? undefined : (e) => void flow.processQr(e.data)}
        />
      ) : null}
      {!flow.result ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <View style={{ width: 240, height: 240, borderWidth: 4, borderColor: '#FFFFFFCC', borderRadius: radius.xl }} />
          <AppText variant="headline" style={{ color: '#FFFFFF', marginTop: spacing.lg, textAlign: 'center' }}>
            {t('checkin.scanHint')}
          </AppText>
        </View>
      ) : (
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.backdrop }]}>
          <CheckinResultCard key={resultKey(flow)} result={flow.result} flow={flow} method="qr" kiosk={kiosk} />
        </View>
      )}
    </View>
  );
}

export function resultKey(flow: CheckinFlow): string {
  const r = flow.result;
  if (!r) return 'none';
  return r.kind === 'error' ? `error-${r.reason}` : `${r.kind}-${r.check.member.id}`;
}
