// Data created at onboarding (spec §5.2 plans / expense_categories, §10.7 templates).
// Everything is editable afterwards.
import type { DurationUnit, PlanCategory, TemplateCategory } from '@/db/models';

export type SeedPlan = {
  name: string;
  category: PlanCategory;
  durationValue: number;
  durationUnit: DurationUnit;
  color: string;
};

/** Prices start at ₹0 for the owner to fill in during onboarding step 5. */
export const SEED_PLANS: SeedPlan[] = [
  { name: 'Monthly', category: 'membership', durationValue: 1, durationUnit: 'months', color: '#FF6B2C' },
  { name: 'Quarterly', category: 'membership', durationValue: 3, durationUnit: 'months', color: '#2563EB' },
  { name: 'Half-Yearly', category: 'membership', durationValue: 6, durationUnit: 'months', color: '#16A34A' },
  { name: 'Yearly', category: 'membership', durationValue: 12, durationUnit: 'months', color: '#9333EA' },
  { name: 'Personal Training – Monthly', category: 'personal_training', durationValue: 1, durationUnit: 'months', color: '#DC2626' },
  { name: 'Locker', category: 'service', durationValue: 1, durationUnit: 'months', color: '#0891B2' },
  { name: 'Diet Plan', category: 'service', durationValue: 1, durationUnit: 'months', color: '#65A30D' },
  // One-time service: valid for the day it's bought.
  { name: 'Steam Bath', category: 'service', durationValue: 1, durationUnit: 'days', color: '#DB2777' },
];

export const SEED_EXPENSE_CATEGORIES: { name: string; icon: string }[] = [
  { name: 'Rent', icon: 'home' },
  { name: 'Electricity', icon: 'flash' },
  { name: 'Water', icon: 'water' },
  { name: 'Staff Salary', icon: 'people' },
  { name: 'Equipment Purchase', icon: 'barbell' },
  { name: 'Equipment Repair', icon: 'construct' },
  { name: 'Cleaning & Housekeeping', icon: 'sparkles' },
  { name: 'Marketing', icon: 'megaphone' },
  { name: 'Internet & Phone', icon: 'wifi' },
  { name: 'Supplements Stock', icon: 'nutrition' },
  { name: 'Maintenance', icon: 'hammer' },
  { name: 'Miscellaneous', icon: 'ellipsis-horizontal' },
];

export type SeedTemplate = { key: string; category: TemplateCategory; title: string; body: string };

// System templates (§10.7) in English and Hindi. They can be edited but not deleted (M14).
export const SEED_TEMPLATES: Record<'en' | 'hi', SeedTemplate[]> = {
  en: [
    { key: 'welcome', category: 'welcome', title: 'Welcome', body: 'Hi {first_name}, welcome to {gym_name}! 💪 Your {plan_name} membership runs from {start_date} to {expiry_date}. Member code: {member_code}. See you at the gym!' },
    { key: 'expiry_reminder', category: 'expiry_reminder', title: 'Expiry reminder', body: 'Hi {first_name}, your {plan_name} membership at {gym_name} expires on {expiry_date} ({days_left} days left). Renew now to keep training without a break. Call us: {gym_phone}' },
    { key: 'expires_today', category: 'expiry_reminder', title: 'Expires today', body: 'Hi {first_name}, your {plan_name} membership at {gym_name} expires today. Renew today to continue your workouts. Call us: {gym_phone}' },
    { key: 'expired', category: 'expired', title: 'Expired (win-back)', body: 'Hi {first_name}, we miss you at {gym_name}! Your membership expired {days_since_expiry} days ago. Come back and restart your fitness journey — call us at {gym_phone}.' },
    { key: 'dues', category: 'dues', title: 'Dues reminder', body: 'Hi {first_name}, a balance of {due_amount} is pending on your {gym_name} membership. Please clear it at your next visit. Thank you!' },
    { key: 'payment_receipt', category: 'payment_receipt', title: 'Payment received', body: 'Hi {first_name}, thank you! We received {paid_amount} (receipt {receipt_no}) on {today}. Balance due: {due_amount}. — {gym_name}' },
    { key: 'renewal_thanks', category: 'renewal_thanks', title: 'Renewal thank you', body: 'Hi {first_name}, thank you for renewing your {plan_name} membership at {gym_name}! It is now valid until {expiry_date}. Keep going! 💪' },
    { key: 'birthday', category: 'birthday', title: 'Birthday wishes', body: 'Happy birthday, {first_name}! 🎂 Wishing you a healthy and strong year ahead. — Team {gym_name}' },
    { key: 'anniversary', category: 'anniversary', title: 'Anniversary wishes', body: 'Happy anniversary, {first_name}! 🎉 Warm wishes from all of us at {gym_name}.' },
    { key: 'absent', category: 'absent', title: 'We miss you', body: 'Hi {first_name}, we haven\'t seen you at {gym_name} for a while. Everything okay? Your trainer {trainer_name} is waiting for you! 💪' },
    { key: 'enquiry_followup', category: 'enquiry_followup', title: 'Enquiry follow-up', body: 'Hi {first_name}, thanks for visiting {gym_name}! Do you have any questions about our plans? Reply here or call us at {gym_phone}.' },
    { key: 'festival', category: 'festival', title: 'Festival / holiday notice', body: 'Dear members, {gym_name} wishes you a happy festival! Please note the gym timings for the holiday: ____. — {gym_name}' },
    { key: 'gym_closed', category: 'custom', title: 'Gym closed / timing change', body: 'Dear members, please note: {gym_name} will be closed / have changed timings on ____. Sorry for the inconvenience. Call {gym_phone} for details.' },
  ],
  hi: [
    { key: 'welcome', category: 'welcome', title: 'स्वागत', body: 'नमस्ते {first_name}, {gym_name} में आपका स्वागत है! 💪 आपकी {plan_name} मेंबरशिप {start_date} से {expiry_date} तक है। मेंबर कोड: {member_code}। जिम में मिलते हैं!' },
    { key: 'expiry_reminder', category: 'expiry_reminder', title: 'समाप्ति रिमाइंडर', body: 'नमस्ते {first_name}, {gym_name} में आपकी {plan_name} मेंबरशिप {expiry_date} को समाप्त हो रही है ({days_left} दिन बाकी)। बिना रुके ट्रेनिंग जारी रखने के लिए अभी रिन्यू करें। कॉल करें: {gym_phone}' },
    { key: 'expires_today', category: 'expiry_reminder', title: 'आज समाप्त', body: 'नमस्ते {first_name}, {gym_name} में आपकी {plan_name} मेंबरशिप आज समाप्त हो रही है। वर्कआउट जारी रखने के लिए आज ही रिन्यू करें। कॉल करें: {gym_phone}' },
    { key: 'expired', category: 'expired', title: 'समाप्त (वापसी)', body: 'नमस्ते {first_name}, {gym_name} में हमें आपकी याद आ रही है! आपकी मेंबरशिप {days_since_expiry} दिन पहले समाप्त हो गई। वापस आइए और फिटनेस सफ़र फिर शुरू कीजिए — कॉल करें {gym_phone}।' },
    { key: 'dues', category: 'dues', title: 'बकाया रिमाइंडर', body: 'नमस्ते {first_name}, आपकी {gym_name} मेंबरशिप पर {due_amount} बकाया है। कृपया अगली विज़िट पर जमा करें। धन्यवाद!' },
    { key: 'payment_receipt', category: 'payment_receipt', title: 'भुगतान प्राप्त', body: 'नमस्ते {first_name}, धन्यवाद! हमें {today} को {paid_amount} (रसीद {receipt_no}) प्राप्त हुए। बकाया: {due_amount}। — {gym_name}' },
    { key: 'renewal_thanks', category: 'renewal_thanks', title: 'रिन्यूअल धन्यवाद', body: 'नमस्ते {first_name}, {gym_name} में अपनी {plan_name} मेंबरशिप रिन्यू करने के लिए धन्यवाद! यह अब {expiry_date} तक मान्य है। लगे रहिए! 💪' },
    { key: 'birthday', category: 'birthday', title: 'जन्मदिन की शुभकामनाएँ', body: 'जन्मदिन मुबारक हो, {first_name}! 🎂 आने वाला साल सेहतमंद और मज़बूत हो। — टीम {gym_name}' },
    { key: 'anniversary', category: 'anniversary', title: 'सालगिरह की शुभकामनाएँ', body: 'सालगिरह मुबारक हो, {first_name}! 🎉 {gym_name} की ओर से हार्दिक शुभकामनाएँ।' },
    { key: 'absent', category: 'absent', title: 'हमें आपकी याद आती है', body: 'नमस्ते {first_name}, काफ़ी दिनों से आप {gym_name} नहीं आए। सब ठीक है? आपके ट्रेनर {trainer_name} आपका इंतज़ार कर रहे हैं! 💪' },
    { key: 'enquiry_followup', category: 'enquiry_followup', title: 'पूछताछ फ़ॉलो-अप', body: 'नमस्ते {first_name}, {gym_name} आने के लिए धन्यवाद! हमारे प्लान के बारे में कोई सवाल है? यहाँ जवाब दें या {gym_phone} पर कॉल करें।' },
    { key: 'festival', category: 'festival', title: 'त्योहार / छुट्टी सूचना', body: 'प्रिय सदस्यों, {gym_name} की ओर से त्योहार की शुभकामनाएँ! छुट्टी के दिन जिम का समय: ____। — {gym_name}' },
    { key: 'gym_closed', category: 'custom', title: 'जिम बंद / समय में बदलाव', body: 'प्रिय सदस्यों, कृपया ध्यान दें: {gym_name} ____ को बंद रहेगा / समय बदला है। असुविधा के लिए खेद है। जानकारी के लिए {gym_phone} पर कॉल करें।' },
  ],
};
