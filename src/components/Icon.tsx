import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon(props: ComponentProps<typeof Ionicons>) {
  return <Ionicons {...props} />;
}
