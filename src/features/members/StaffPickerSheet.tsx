import { useTranslation } from 'react-i18next';

import { ChoiceSheet } from '@/components';
import type { Staff } from '@/db/models';

const NONE = '__none__';

/** Pick a trainer (or "No trainer") — used by bulk "Assign trainer" (§10.2). */
export function TrainerSheet({
  visible,
  onClose,
  trainers,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  trainers: Staff[];
  onSelect: (trainer: Staff | null) => void;
}) {
  const { t } = useTranslation();
  return (
    <ChoiceSheet<string>
      visible={visible}
      onClose={onClose}
      title={t('members.bulk.trainer')}
      value={null}
      options={[
        { value: NONE, label: t('members.noTrainer') },
        ...trainers.map((s) => ({ value: s.id, label: s.name, description: t(`roles.${s.role}`) })),
      ]}
      onSelect={(id) => onSelect(trainers.find((s) => s.id === id) ?? null)}
    />
  );
}
