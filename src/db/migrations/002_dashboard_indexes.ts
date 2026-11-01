import type { Migration } from './types';

// Indexes for the dashboard aggregates (M10, spec §10.1 "< 500 ms with 5,000 members, 20,000
// payments and 100,000 attendance rows") and the per-member audit history (M07).
const SQL = `
CREATE INDEX IF NOT EXISTS ix_members_joining_date ON members(joining_date);
CREATE INDEX IF NOT EXISTS ix_subscriptions_created_at ON subscriptions(created_at);
CREATE INDEX IF NOT EXISTS ix_subscriptions_renewed_from ON subscriptions(renewed_from_subscription_id);
CREATE INDEX IF NOT EXISTS ix_audit_log_entity_id ON audit_log(entity_id);
`;

export const migration002DashboardIndexes: Migration = {
  version: 2,
  name: 'dashboard_indexes',
  up: (db) => db.execAsync(SQL),
};
