import { supabase } from "@/integrations/supabase/client";

export { supabase };

// Helper to extract email domain
export const getEmailDomain = (email: string): string => {
  return email.split('@')[1]?.toLowerCase() || '';
};

// Common free email providers that should be blocked for company registration
export const FREE_EMAIL_PROVIDERS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'aol.com',
  'icloud.com',
  'mail.com',
  'protonmail.com',
  'zoho.com',
  'yandex.com',
];

export const isCompanyEmail = (email: string): boolean => {
  const domain = getEmailDomain(email);
  return !FREE_EMAIL_PROVIDERS.includes(domain);
};
