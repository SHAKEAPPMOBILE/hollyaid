import { supabase } from '@/integrations/supabase/client';

export type CompanyAccessRecord = {
  id: string;
  name: string;
  email_domain: string;
  subscription_status: string | null;
};

export type CompanyAdminAccess = {
  company: CompanyAccessRecord | null;
  companySource: 'owner' | 'employee_link' | null;
  hasCompanyAdminRole: boolean;
  isCompanyAdmin: boolean;
  error: string | null;
};

const resolveCompanyById = async (companyId: string): Promise<{ company: CompanyAccessRecord | null; error: string | null }> => {
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, name, email_domain, subscription_status')
    .eq('id', companyId)
    .maybeSingle();

  if (companyError) {
    return { company: null, error: companyError.message };
  }

  return { company: company ?? null, error: null };
};

export const getCompanyAdminAccess = async (userId: string, userEmail?: string | null): Promise<CompanyAdminAccess> => {
  const { data: companies, error: companyError } = await supabase
    .from('companies')
    .select('id, name, email_domain, subscription_status, created_at')
    .eq('admin_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (companyError) {
    return {
      company: null,
      companySource: null,
      hasCompanyAdminRole: false,
      isCompanyAdmin: false,
      error: companyError.message,
    };
  }

  const company = companies?.[0]
    ? {
        id: companies[0].id,
        name: companies[0].name,
        email_domain: companies[0].email_domain,
        subscription_status: companies[0].subscription_status,
      }
    : null;
  let companySource: 'owner' | 'employee_link' | null = company ? 'owner' : null;

  const { data: roleRow, error: roleError } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('role', 'company_admin')
    .maybeSingle();

  if (roleError) {
    return {
      company,
      companySource,
      hasCompanyAdminRole: false,
      isCompanyAdmin: !!company,
      error: roleError.message,
    };
  }

  const hasCompanyAdminRole = !!roleRow;
  let resolvedCompany = company;

  if (!resolvedCompany && hasCompanyAdminRole) {
    const { data: linkByUser, error: userLinkError } = await supabase
      .from('company_employees')
      .select('company_id, accepted_at, invited_at')
      .eq('user_id', userId)
      .eq('status', 'accepted')
      .order('accepted_at', { ascending: false, nullsFirst: false })
      .order('invited_at', { ascending: false })
      .limit(1);

    if (userLinkError) {
      return {
        company: null,
        companySource: null,
        hasCompanyAdminRole,
        isCompanyAdmin: hasCompanyAdminRole,
        error: userLinkError.message,
      };
    }

    let linkedCompanyId = linkByUser?.[0]?.company_id ?? null;

    if (!linkedCompanyId && userEmail) {
      const normalizedEmail = userEmail.trim().toLowerCase();
      const { data: linkByEmail, error: emailLinkError } = await supabase
        .from('company_employees')
        .select('company_id, accepted_at, invited_at')
        .eq('email', normalizedEmail)
        .eq('status', 'accepted')
        .order('accepted_at', { ascending: false, nullsFirst: false })
        .order('invited_at', { ascending: false })
        .limit(1);

      if (emailLinkError) {
        return {
          company: null,
          companySource: null,
          hasCompanyAdminRole,
          isCompanyAdmin: hasCompanyAdminRole,
          error: emailLinkError.message,
        };
      }

      linkedCompanyId = linkByEmail?.[0]?.company_id ?? null;
    }

    if (linkedCompanyId) {
      const { company: linkedCompany, error: linkedCompanyError } = await resolveCompanyById(linkedCompanyId);

      if (linkedCompanyError) {
        return {
          company: null,
          companySource: null,
          hasCompanyAdminRole,
          isCompanyAdmin: hasCompanyAdminRole,
          error: linkedCompanyError,
        };
      }

      resolvedCompany = linkedCompany;
      companySource = linkedCompany ? 'employee_link' : null;
    }
  }

  return {
    company: resolvedCompany,
    companySource,
    hasCompanyAdminRole,
    isCompanyAdmin: !!resolvedCompany || hasCompanyAdminRole,
    error: null,
  };
};
