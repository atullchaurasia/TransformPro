// CSV import (§10.2): load lookups, validate (domain), then import every valid row in ONE
// transaction — if anything fails, nothing is imported.
import { File, Paths } from 'expo-file-system';

import { getDb, writeTransaction } from '@/db/client';
import { importMembers } from '@/db/repositories/memberImport';
import { listPhonesAndCodes } from '@/db/repositories/members';
import { listActivePlans } from '@/db/repositories/plans';
import { sampleCsv, type RowResult } from '@/domain/csvImport';
import { shareFile } from '@/services/pdf';
import { getCurrentStaffId } from '@/store/sessionStore';
import { getSettings } from '@/store/settingsStore';

export async function loadImportLookups() {
  const db = getDb();
  const { phones, codes } = await listPhonesAndCodes(db);
  return { plans: await listActivePlans(db), existingPhones: phones, existingCodes: codes };
}

export function importRows(rows: Extract<RowResult, { status: 'ok' }>[]): Promise<number> {
  const s = getSettings();
  return writeTransaction((tx) =>
    importMembers(tx, rows, {
      tax: { enabled: s.tax_enabled, percent: s.tax_percent, inclusive: s.tax_inclusive },
      branchId: s.default_branch_id,
      createdBy: getCurrentStaffId(),
      currency: s.currency_code,
    }),
  );
}

/** Shares the sample template (§10.2 "download a sample CSV template"). */
export async function shareTemplate(): Promise<'shared' | 'unavailable'> {
  const file = new File(Paths.cache, 'TransformPro-members-template.csv');
  if (file.exists) file.delete();
  file.create();
  await file.write(`﻿${sampleCsv()}`);
  return shareFile(file.uri, 'text/csv', 'public.comma-separated-values-text');
}
