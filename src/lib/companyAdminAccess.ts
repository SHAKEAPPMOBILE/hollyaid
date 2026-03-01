import { supabase } from '@/integrations/supabase/client';

export type CompanyAccessRecord = {
  id: string;
  subscription_status: string | null;
};

export type CompanyAdminAccess = {
  company: CompanyAccessRecord | null;
  hasCompanyAdminRole: boolean;
  isCompanyAdmin: boolean;
  error: string | null;
};

export const getCompanyAdminAccess = async (userId: string): Promise<CompanyAdminAccess> => {
  const { data: companies, error: companyError } = await supabase
    .from('companies')
    .select('id, subscription_status, created_at')
    .eq('admin_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (companyError) {
    return {
      company: null,
      hasCompanyAdminRole: false,
      isCompanyAdmin: false,
      error: companyError.message,
    };
  }

  const company = companies?.[0]
    ? {
        id: companies[0].id,
        subscription_status: companies[0].subscription_status,
      }
    : null;

  const { data: roleRow, error: roleError } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('role', 'company_admin')
    .maybeSingle();

  if (roleError) {
    return {
      company,
      hasCompanyAdminRole: false,
      isCompanyAdmin: !!company,
      error: roleError.message,
    };
  }

  const hasCompanyAdminRole = !!roleRow;

  return {
    company,
    hasCompanyAdminRole,
    isCompanyAdmin: !!company || hasCompanyAdminRole,
    error: null,
  };
};
