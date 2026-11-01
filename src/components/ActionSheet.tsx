import { useRef, type ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme';

import { BottomSheet } from './BottomSheet';
import type { IconName } from './Icon';
import { ListRow } from './ListRow';

export type ActionSheetItem<K extends string> = { key: K; label: string; subtitle?: string; icon: IconName; color?: string; destructive?: boolean };

export type ActionSheetProps<K extends string> = {
  visible: boolean;
  title?: string;
  items: ActionSheetItem<K>[];
  onClose: () => void;
  /**
   * Runs after the sheet has fully closed. iOS can't present a dialog or another sheet while
   * one is still on screen, so the chosen action must wait for the dismissal.
   */
  onSelect: (key: K) => void;
  /** Optional content above the actions (e.g. a receipt preview). */
  header?: ReactNode;
};

const DISMISS_FALLBACK_MS = 700;

/** iOS-style list of actions in a bottom sheet. */
export function ActionSheet<K extends string>({ visible, title, items, onClose, onSelect, header }: ActionSheetProps<K>) {
  const { colors } = useTheme();
  const pending = useRef<K | null>(null);

  const runPending = () => {
    const key = pending.current;
    pending.current = null;
    if (key !== null) onSelect(key);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} onDismiss={runPending}>
      <View>
        {header}
        {items.map((item) => (
          <ListRow
            key={item.key}
            title={item.label}
            subtitle={item.subtitle}
            icon={item.icon}
            iconBackground={item.color ?? (item.destructive ? colors.danger : colors.primary)}
            destructive={item.destructive}
            showChevron={false}
            onPress={() => {
              pending.current = item.key;
              onClose();
              // Fallback in case the platform doesn't report the dismissal.
              setTimeout(runPending, DISMISS_FALLBACK_MS);
            }}
          />
        ))}
      </View>
    </BottomSheet>
  );
}
