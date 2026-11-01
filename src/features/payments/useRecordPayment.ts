import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { todayISO } from '@/domain/dates';
import { allocatePayment, validateManualAllocation, type Allocation, type AllocationResult } from '@/domain/dues';
import type { SubscriptionRow } from '@/domain/memberProfile';
import { loadProfile, type LoadedProfile } from '@/features/profile/profileActions';
import { logger } from '@/utils/logger';

import { paymentFormSchema, type PaymentFormValues } from './paymentSchema';

export type OpenDue = { row: SubscriptionRow; duePaise: number };

/**
 * Record payment state (§10.5, §6.5): the member's open plans with dues (oldest first), the
 * amount split oldest-first or by hand, and overpayment only as an advance.
 */
export function useRecordPayment(memberId: string | null) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<LoadedProfile | null | 'missing'>(null);
  const [manual, setManual] = useState(false);
  const [parts, setParts] = useState<Record<string, number>>({});
  const [asAdvance, setAsAdvance] = useState(false);
  const schema = useMemo(() => paymentFormSchema({ required: t('validation.required'), amount: t('validation.amount') }), [t]);
  const form = useForm<PaymentFormValues>({ resolver: zodResolver(schema), defaultValues: { amountPaise: 0, mode: 'cash', reference: '', paidOn: todayISO(), note: '' } });
  const amount = useWatch({ control: form.control, name: 'amountPaise' });
  const { setValue } = form;

  useEffect(() => {
    if (!memberId) return setProfile(null);
    let alive = true;
    loadProfile(memberId)
      .then((p) => {
        if (!alive) return;
        setProfile(p ?? 'missing');
        // Default amount = everything due (net of any advance).
        setValue('amountPaise', p?.summary.dues.totalDuePaise ?? 0);
        setParts({});
        setManual(false);
        setAsAdvance(false);
      })
      .catch((e: unknown) => {
        logger.error('Loading member for payment failed', e);
        if (alive) setProfile('missing');
      });
    return () => {
      alive = false;
    };
  }, [memberId, setValue]);

  const loaded = profile && profile !== 'missing' ? profile : null;
  const dues: OpenDue[] = useMemo(() => {
    if (!loaded) return [];
    const rows = new Map(loaded.summary.rows.map((r) => [r.sub.id, r]));
    return loaded.summary.dues.subscriptions.flatMap((d) => {
      const row = rows.get(d.subscriptionId);
      return row ? [{ row, duePaise: d.duePaise }] : [];
    });
  }, [loaded]);
  const totalDue = dues.reduce((s, d) => s + d.duePaise, 0);
  // Nothing due → whatever is paid is an advance for the next plan (§6.5).
  const advanceOnly = loaded !== null && totalDue === 0;

  const split: AllocationResult | null = useMemo(() => {
    if (!loaded) return null;
    const asDues = dues.map((d) => ({ subscriptionId: d.row.sub.id, duePaise: d.duePaise }));
    if (manual && !advanceOnly) {
      const list: Allocation[] = Object.entries(parts)
        .filter(([, v]) => v > 0)
        .map(([subscriptionId, amountPaise]) => ({ subscriptionId, amountPaise }));
      if (list.length === 0) return { ok: false, error: 'invalid_amount', maxPaise: totalDue };
      return validateManualAllocation(list, asDues);
    }
    return allocatePayment(amount || 0, asDues, asAdvance || advanceOnly);
  }, [loaded, dues, manual, parts, amount, asAdvance, advanceOnly, totalDue]);

  const manualTotal = Object.values(parts).reduce((s, v) => s + (v > 0 ? v : 0), 0);

  return {
    profile,
    loaded,
    form,
    dues,
    totalDue,
    advanceOnly,
    manual,
    setManual: (on: boolean) => {
      setManual(on);
      setParts({});
    },
    parts,
    setPart: (subscriptionId: string, paise: number) => setParts((p) => ({ ...p, [subscriptionId]: paise })),
    manualTotal,
    asAdvance,
    setAsAdvance,
    split,
    /** The amount actually being paid. */
    paying: manual && !advanceOnly ? manualTotal : amount || 0,
  };
}
