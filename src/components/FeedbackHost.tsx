import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useFeedbackStore, type ToastItem } from '@/store/feedbackStore';
import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';
import { Icon } from './Icon';

const TOAST_MS = 2600;

function Toast({ item }: { item: ToastItem }) {
  const { colors, radius, spacing } = useTheme();
  const dismiss = useFeedbackStore((s) => s.dismissToast);

  useEffect(() => {
    const timer = setTimeout(() => dismiss(item.id), TOAST_MS);
    return () => clearTimeout(timer);
  }, [dismiss, item.id]);

  const tone = {
    success: { icon: 'checkmark-circle', color: colors.success },
    error: { icon: 'alert-circle', color: colors.danger },
    info: { icon: 'information-circle', color: colors.info },
  } as const;
  const { icon, color } = tone[item.kind];

  return (
    <Pressable
      onPress={() => dismiss(item.id)}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.toast, { backgroundColor: colors.surfaceElevated, borderRadius: radius.lg, padding: spacing.md }]}
    >
      <Icon name={icon} size={22} color={color} />
      <AppText variant="subhead" weight="600" style={styles.flex}>
        {item.message}
      </AppText>
    </Pressable>
  );
}

function ConfirmDialog() {
  const { colors, radius, spacing, typography } = useTheme();
  const { t } = useTranslation();
  const pending = useFeedbackStore((s) => s.pendingConfirm);
  const settle = useFeedbackStore((s) => s.settleConfirm);
  const [typed, setTyped] = useState('');

  useEffect(() => setTyped(''), [pending]);

  if (!pending) return null;
  const needsTyping = !!pending.typedConfirmation;
  const canConfirm = !needsTyping || typed.trim() === pending.typedConfirmation;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => settle(false)}>
      <KeyboardAvoidingView behavior="padding" style={[styles.dialogRoot, { backgroundColor: colors.backdrop }]}>
        <View style={[styles.dialog, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md }]}>
          <AppText variant="title3" align="center">
            {pending.title}
          </AppText>
          {pending.message ? (
            <AppText variant="subhead" tone="secondary" align="center">
              {pending.message}
            </AppText>
          ) : null}
          {needsTyping ? (
            <View style={{ gap: spacing.xs }}>
              <AppText variant="footnote" tone="secondary" align="center">
                {t('dialog.typeToConfirm', { word: pending.typedConfirmation })}
              </AppText>
              <TextInput
                value={typed}
                onChangeText={setTyped}
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus
                accessibilityLabel={t('dialog.typeToConfirm', { word: pending.typedConfirmation })}
                style={[
                  typography.headline,
                  styles.typedInput,
                  { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.background },
                ]}
              />
            </View>
          ) : null}
          <View style={{ gap: spacing.sm }}>
            <Button
              label={pending.confirmLabel ?? t('common.confirm')}
              variant={pending.destructive ? 'destructive' : 'primary'}
              disabled={!canConfirm}
              fullWidth
              onPress={() => settle(true)}
            />
            <Button label={pending.cancelLabel ?? t('common.cancel')} variant="secondary" fullWidth onPress={() => settle(false)} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Mount once at the root: renders toasts and confirmation dialogs. */
export function FeedbackHost() {
  const toasts = useFeedbackStore((s) => s.toasts);
  const insets = useSafeAreaInsets();
  return (
    <>
      <View pointerEvents="box-none" style={[styles.toastStack, { top: insets.top + 8 }]}>
        {toasts.map((item) => (
          <Toast key={item.id} item={item} />
        ))}
      </View>
      <ConfirmDialog />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  toastStack: { position: 'absolute', left: 16, right: 16, gap: 8 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  dialogRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 400 },
  typedInput: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, textAlign: 'center', letterSpacing: 2 },
});
