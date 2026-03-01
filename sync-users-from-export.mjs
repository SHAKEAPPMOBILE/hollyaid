#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const VALID_ROLES = new Set(["admin", "company_admin", "employee", "specialist"]);

const parseArgs = () => {
  const args = process.argv.slice(2);
  const out = {
    file: null,
    execute: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--execute") {
      out.execute = true;
      continue;
    }
    if (!out.file) {
      out.file = arg;
      continue;
    }
  }

  return out;
};

const parseCsvLine = (line) => {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  result.push(current);
  return result.map((value) => value.trim());
};

const parseSectionedExport = (raw) => {
  const lines = raw.split(/\r?\n/);
  const sections = new Map();

  let currentSection = null;
  let headers = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const sectionMatch = line.match(/^===\s*(.+?)\s*===$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      headers = null;
      if (!sections.has(currentSection)) {
        sections.set(currentSection, []);
      }
      continue;
    }

    if (!currentSection) continue;

    if (!headers) {
      headers = parseCsvLine(line);
      continue;
    }

    const values = parseCsvLine(line);
    const row = {};
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]] = values[i] ?? "";
    }
    sections.get(currentSection).push(row);
  }

  return sections;
};

const normalizeEmail = (value) => (value || "").trim().toLowerCase();

const splitRoles = (value) => {
  if (!value) return [];
  return value
    .split(",")
    .map((r) => r.trim().toLowerCase())
    .filter((r) => VALID_ROLES.has(r));
};

const loadEnvValue = (key) => {
  if (process.env[key]) return process.env[key];

  const envPath = path.resolve(".env");
  if (!fs.existsSync(envPath)) return null;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const idx = line.indexOf("=");
    const k = line.slice(0, idx).trim();
    if (k !== key) continue;
    return line.slice(idx + 1).trim().replace(/^"|"$/g, "");
  }

  return null;
};

const listAllAuthUsersByEmail = async (adminClient) => {
  const byEmail = new Map();
  const perPage = 1000;

  for (let page = 1; page < 100; page++) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`auth.admin.listUsers failed: ${error.message}`);

    const users = data?.users ?? [];
    for (const user of users) {
      const email = normalizeEmail(user.email);
      if (email) byEmail.set(email, user.id);
    }

    if (users.length < perPage) break;
  }

  return byEmail;
};

const toBoolean = (value) => {
  const v = (value || "").toString().trim().toLowerCase();
  return v === "true" || v === "yes";
};

const main = async () => {
  const { file, execute } = parseArgs();
  if (!file) {
    console.error("Usage: node sync-users-from-export.mjs <path-to-export.csv> [--execute]");
    process.exit(1);
  }

  if (!fs.existsSync(file)) {
    console.error(`File not found: ${file}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(file, "utf8");
  const sections = parseSectionedExport(raw);

  const users = sections.get("USERS / PROFILES") ?? [];
  const companies = sections.get("COMPANIES") ?? [];
  const employees = sections.get("EMPLOYEES") ?? [];

  const rolesByEmail = new Map();
  for (const row of users) {
    const email = normalizeEmail(row.email);
    if (!email) continue;
    const roles = splitRoles(row.role);
    if (!roles.length) continue;
    rolesByEmail.set(email, roles);
  }

  const companyRowsByName = new Map();
  for (const row of companies) {
    if (!row.name) continue;
    companyRowsByName.set(row.name.trim(), row);
  }

  const summary = {
    users: users.length,
    companies: companies.length,
    employees: employees.length,
    uniqueRoleAssignments: Array.from(rolesByEmail.values()).reduce((sum, list) => sum + list.length, 0),
    executeRequested: execute,
  };

  const supabaseUrl = loadEnvValue("VITE_SUPABASE_URL");
  const serviceRole = loadEnvValue("SUPABASE_SERVICE_ROLE_KEY");
  const canExecute = execute && !!supabaseUrl && !!serviceRole;

  console.log("Parsed export summary:");
  console.log(JSON.stringify(summary, null, 2));

  if (!canExecute) {
    console.log("");
    console.log("Dry run only. No writes performed.");
    if (execute && !serviceRole) {
      console.log("Missing SUPABASE_SERVICE_ROLE_KEY in environment or .env.");
    }
    console.log("");
    console.log("Planned role sync by email:");
    for (const [email, roles] of rolesByEmail.entries()) {
      console.log(`- ${email}: [${roles.join(", ")}]`);
    }
    console.log("");
    console.log("Planned employee-company links:");
    for (const row of employees) {
      const email = normalizeEmail(row.email);
      const companyName = (row.company_name || "").trim();
      const status = (row.status || "").trim().toLowerCase();
      const autoJoined = toBoolean(row.auto_joined);
      console.log(`- ${email} -> ${companyName} (status=${status || "unknown"}, auto_joined=${autoJoined})`);
    }
    return;
  }

  const adminClient = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
  const authUsersByEmail = await listAllAuthUsersByEmail(adminClient);

  const { data: existingCompanies, error: companyLoadError } = await adminClient
    .from("companies")
    .select("id, name");
  if (companyLoadError) throw new Error(`Failed loading companies: ${companyLoadError.message}`);

  const companyIdByName = new Map();
  for (const c of existingCompanies ?? []) {
    companyIdByName.set((c.name || "").trim(), c.id);
  }

  let updatedProfiles = 0;
  let upsertedRoles = 0;
  let upsertedEmployeeLinks = 0;
  const skippedMissingAuth = [];
  const skippedMissingCompany = [];

  for (const row of users) {
    const email = normalizeEmail(row.email);
    if (!email) continue;
    const userId = authUsersByEmail.get(email);
    if (!userId) {
      skippedMissingAuth.push(email);
      continue;
    }

    const profileUpdate = {
      full_name: row.full_name || null,
      phone_number: row.phone_number || null,
      job_title: row.job_title || null,
      department: row.department || null,
      updated_at: new Date().toISOString(),
    };

    const { error: profileError } = await adminClient
      .from("profiles")
      .update(profileUpdate)
      .eq("user_id", userId);

    if (profileError) {
      throw new Error(`Failed updating profile for ${email}: ${profileError.message}`);
    }
    updatedProfiles++;

    const roles = rolesByEmail.get(email) ?? [];
    for (const role of roles) {
      const { error: roleError } = await adminClient
        .from("user_roles")
        .upsert(
          {
            user_id: userId,
            role,
          },
          { onConflict: "user_id,role" },
        );

      if (roleError) {
        throw new Error(`Failed upserting role ${role} for ${email}: ${roleError.message}`);
      }
      upsertedRoles++;
    }
  }

  for (const row of employees) {
    const email = normalizeEmail(row.email);
    if (!email) continue;

    const companyName = (row.company_name || "").trim();
    if (!companyRowsByName.has(companyName)) {
      skippedMissingCompany.push({ email, companyName, reason: "company_name_not_in_export_company_section" });
      continue;
    }

    const companyId = companyIdByName.get(companyName);
    if (!companyId) {
      skippedMissingCompany.push({ email, companyName, reason: "company_not_found_in_database" });
      continue;
    }

    const userId = authUsersByEmail.get(email) ?? null;
    const status = (row.status || "invited").trim().toLowerCase();
    const acceptedAt = row.accepted_at ? new Date(row.accepted_at).toISOString() : null;
    const autoJoined = toBoolean(row.auto_joined);

    const { error: employeeError } = await adminClient
      .from("company_employees")
      .upsert(
        {
          company_id: companyId,
          email,
          user_id: userId,
          status,
          accepted_at: acceptedAt,
          auto_joined: autoJoined,
        },
        { onConflict: "company_id,email" },
      );

    if (employeeError) {
      throw new Error(`Failed upserting employee link for ${email} -> ${companyName}: ${employeeError.message}`);
    }
    upsertedEmployeeLinks++;
  }

  console.log("Sync complete:");
  console.log(
    JSON.stringify(
      {
        updatedProfiles,
        upsertedRoles,
        upsertedEmployeeLinks,
        skippedMissingAuth,
        skippedMissingCompany,
      },
      null,
      2,
    ),
  );
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
