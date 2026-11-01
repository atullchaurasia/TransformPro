import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import type { Subscription } from '@/db/models';
import { todayISO } from '@/domain/dates';
import { advanceBalance, maxRefundable } from '@/domain/dues';
import { loadProfile, type LoadedProfile } from '@/features/profile/profileActions';
import { logger } from '@/utils/logger';

import { paymentFormSchema, type PaymentFormValues } from './paymentSchema';

export const ADVANCE = '__advance__';

export type RefundTarget = { key: string; subscription: Subscription | null; maxPaise: number };

/** What can be refunded (§10.5): money actually paid on a plan, or the unused advance (§6.5). */
export function useRefund(memberId: string | null, subscriptionId: string | undefined) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<LoadedProfile | null | 'missing'>(null);
  const [targetKey, setTargetKey] = useState<string | null>(subscriptionId ?? null);
  const schema = useMemo(
    () =>
      paymentFormSchema({ required: t('validation.required'), amount: t('validation.amount') }).refine((v) => v.note.trim().length > 0, {
        path: ['note'],
        message: t('validation.required'),
      }),
    [t],
  );
  const form = useForm<PaymentFormValues>({ resolver: zodResolver(schema), defaultValues: { amountPaise: 0, mode: 'cash', reference: '', paidOn: todayISO(), note: '' } });

  useEffect(() => {
    if (!memberId) return setProfile(null);
    let alive = true;
    loadProfile(memberId)
      .then((p) => alive && setProfile(p ?? 'missing'))
      .catch((e: unknown) => {
        logger.error('Loading member for refund failed', e);
        if (alive) setProfile('missing');
      });
    return () => {
      alive = false;
    };
  }, [memberId]);

  const loaded = profile && profile !== 'missing' ? profile : null;
  const targets: RefundTarget[] = useMemo(() => {
    if (!loaded) return [];
    const live = loaded.payments.filter((p) => p.deletedAt == null);
    const subs = loaded.subscriptions
      .map((s) => ({ key: s.id, subscription: s, maxPaise: maxRefundable(s.id, live) }))
      .filter((x) => x.maxPaise > 0);
    const advance = advanceBalance(live);
    return advance > 0 ? [...subs, { key: ADVANCE, subscription: null, maxPaise: advance }] : subs;
  }, [loaded]);

  const target = targets.find((x) => x.key === targetKey) ?? (targets.length === 1 ? targets[0] : undefined) ?? null;
  return { profile, loaded, form, targets, target, setTargetKey };
}
