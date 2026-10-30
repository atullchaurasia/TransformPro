import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

export type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Optional right-side header action, e.g. a "Done" button. */
  headerRight?: ReactNode;
  /**
   * Called once the sheet has fully closed. iOS can't present a modal (confirm dialog,
   * another sheet) while one is still on screen or animating away, so follow-up UI opens here.
   */
  onDismiss?: () => void;
};

/** Slide-up sheet for quick actions and pickers (spec §12). Tap backdrop to close. */
export function BottomSheet({ visible, onClose, title, children, headerRight, onDismiss }: BottomSheetProps) {
  const { colors, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const translateY = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(400);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 18 }).start();
    }
  }, [visible, translateY]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} onDismiss={onDismiss} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.backdrop }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.closeSheet')}
        />
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              paddingBottom: insets.bottom + spacing.lg,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          {title || headerRight ? (
            <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
              <AppText variant="headline" style={styles.title} numberOfLines={1}>
                {title}
              </AppText>
              {headerRight ?? (
                <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.close')}>
                  <Icon name="close-circle" size={28} color={colors.textTertiary} />
                </Pressable>
              )}
            </View>
          ) : null}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '88%' },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, marginTop: 8, marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 44, marginBottom: 4 },
  title: { flex: 1 },
});
