import type {
  Attendance,
  AuditLog,
  Branch,
  Enquiry,
  EnquiryFollowup,
  Expense,
  ExpenseCategory,
  Freeze,
  Measurement,
  Member,
  MessageLog,
  MessageTemplate,
  Payment,
  Plan,
  Staff,
  StaffAttendance,
  Subscription,
} from '../models';

import { createRepository } from './base';

// Generic CRUD per table. Feature-specific queries (search, filters, aggregates) are added
// as functions in sibling files by the milestone that needs them (UI never writes SQL).
export const branchesRepo = createRepository<Branch>({ table: 'branches', booleans: ['isActive'] });
export const staffRepo = createRepository<Staff>({ table: 'staff', booleans: ['isActive'], softDelete: true });
export const membersRepo = createRepository<Member>({ table: 'members', softDelete: true });
export const plansRepo = createRepository<Plan>({ table: 'plans', booleans: ['isActive'], softDelete: true });
export const subscriptionsRepo = createRepository<Subscription>({ table: 'subscriptions' });
export const freezesRepo = createRepository<Freeze>({ table: 'freezes' });
export const paymentsRepo = createRepository<Payment>({ table: 'payments', booleans: ['isRefund'], softDelete: true });
export const attendanceRepo = createRepository<Attendance>({ table: 'attendance' });
export const staffAttendanceRepo = createRepository<StaffAttendance>({ table: 'staff_attendance' });
export const measurementsRepo = createRepository<Measurement>({ table: 'measurements' });
export const enquiriesRepo = createRepository<Enquiry>({ table: 'enquiries', softDelete: true });
export const enquiryFollowupsRepo = createRepository<EnquiryFollowup>({ table: 'enquiry_followups' });
export const expenseCategoriesRepo = createRepository<ExpenseCategory>({ table: 'expense_categories', booleans: ['isActive'] });
export const expensesRepo = createRepository<Expense>({ table: 'expenses', booleans: ['isRecurring'], softDelete: true });
export const messageTemplatesRepo = createRepository<MessageTemplate>({ table: 'message_templates', booleans: ['isSystem'] });
export const messageLogRepo = createRepository<MessageLog>({ table: 'message_log' });
export const auditLogRepo = createRepository<AuditLog>({ table: 'audit_log' });

export { writeAudit } from './audit';
export type { AuditEntry } from './audit';
export { getAllSettings, getSetting, setSetting } from './settings';
