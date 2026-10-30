import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Icon, type IconName } from '@/components';
import { minTapSize, useTheme } from '@/theme';

export type BulkAction = 'message' | 'export' | 'trash' | 'branch' | 'trainer';

function BulkButton({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  const { colors } = useTheme();
  const color = danger ? colors.danger : colors.primary;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ flex: 1, minHeight: minTapSize, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <Icon name={icon} size={22} color={color} />
      <AppText variant="caption" style={{ color }} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Multi-select actions (§10.2): message, export, trash, branch, trainer. Hidden ones aren't rendered. */
export function BulkBar({ actions, onAction }: { actions: BulkAction[]; onAction: (a: BulkAction) => void }) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const icons: Record<BulkAction, IconName> = {
    message: 'chatbubble-ellipses-outline',
    export: 'share-outline',
    trash: 'trash-outline',
    branch: 'business-outline',
    trainer: 'person-add-outline',
  };
  return (
    <View
      style={{
        flexDirection: 'row',
        paddingHorizontal: spacing.sm,
        paddingTop: spacing.sm,
        // The tab bar sits below this, so no safe-area padding is needed.
        paddingBottom: spacing.sm,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.separator,
      }}
    >
      {actions.map((a) => (
        <BulkButton key={a} icon={icons[a]} label={t(`members.bulk.${a}`)} danger={a === 'trash'} onPress={() => onAction(a)} />
      ))}
    </View>
  );
}
