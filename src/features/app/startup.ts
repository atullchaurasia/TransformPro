// App-start pipeline (CLAUDE.md §13): migrations (already done when the DB opened) →
// auto check-out → trash auto-purge → daily auto-backup → reschedule notifications.
// Each step is isolated: one failure is logged and never blocks the next step or the launch.
import { runAutoBackupIfDue } from '@/features/backup/backupActions';
import { autoCheckoutSafely } from '@/features/checkin/checkinActions';
import { purgeOldTrash } from '@/features/members/memberActions';
import { purgeOldPaymentTrash } from '@/features/payments/paymentActions';
import { closeFinishedFreezesSafely } from '@/features/profile/profileActions';
import { logger } from '@/utils/logger';

type Step = { name: string; run: () => Promise<unknown> };

const STEPS: Step[] = [
  { name: 'auto check-out', run: autoCheckoutSafely },
  // Not in the §13 list, but it must run before anything reads statuses (§6.4, M07).
  { name: 'end finished freezes', run: closeFinishedFreezesSafely },
  { name: 'trash purge (members)', run: purgeOldTrash },
  { name: 'trash purge (payments)', run: purgeOldPaymentTrash },
  // After the purges so the daily copy reflects the cleaned-up data.
  { name: 'daily auto-backup', run: runAutoBackupIfDue },
  // TODO(M15): reschedule local notifications.
];

let running: Promise<void> | null = null;

/** Runs once per app start (a second call while it's running just waits for it). */
export function runStartupPipeline(): Promise<void> {
  running ??= (async () => {
    for (const step of STEPS) {
      try {
        await step.run();
      } catch (e) {
        logger.error(`Start-up step "${step.name}" failed`, e);
      }
    }
  })().finally(() => {
    running = null;
  });
  return running;
}
