# Hollyaid - Workplace Wellness Platform

## Project info

**URL**: https://hollyaid.com

## How can I edit this code?

There are several ways of editing your application.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will be reflected in your deployment.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## How can I deploy this project?

Deploy to your preferred hosting platform (Vercel, Netlify, etc.) using the build output from `npm run build`.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Can I connect a custom domain?

Yes, you can!

To connect a domain, configure it through your hosting provider's dashboard.

## Magic link: send users to Netlify (not Lovable)

The **login link in the email** is decided by the **build** that served the page where you clicked "Send Login Link". If that build was from Lovable (e.g. you were on hollyaid.com and that domain points to Lovable), the email will contain the Lovable URL no matter what you set in Netlify.

### 1. Set the env var in Netlify

- Netlify Dashboard → **hollyaidapp** → **Site configuration** → **Environment variables**.
- Add: **Key** `VITE_AUTH_REDIRECT_URL`, **Value** `https://hollyaidapp.netlify.app` (no trailing slash).

### 2. Trigger a new deploy

- The value is baked in at **build time**. After adding the variable, run **"Trigger deploy"** → **"Clear cache and deploy site"** (or push a commit) so Netlify rebuilds with the new env var.

### 3. Request the link from the Netlify URL only

- Open **https://hollyaidapp.netlify.app** (not hollyaid.com if that still points to Lovable).
- Go to **Login** → enter email → **Send Login Link**.
- The email you get will then point to `hollyaidapp.netlify.app/auth/callback` because the page that sent it was the Netlify build.

### 4. Supabase: Site URL and Redirect URLs

- **Authentication** → **URL Configuration**:
  - **Site URL:** set to `https://hollyaidapp.netlify.app` (or your main production URL).
  - **Redirect URLs:** include `https://hollyaidapp.netlify.app/auth/callback`.

### 5. Use a new email

- Don’t reuse an old magic-link email. After the steps above, request a **new** link from **hollyaidapp.netlify.app** and click the link in that new email.

If hollyaid.com is your main domain and it currently points to Lovable, either point **hollyaid.com** to Netlify in DNS and set `VITE_AUTH_REDIRECT_URL` to `https://hollyaid.com`, or use **hollyaidapp.netlify.app** for login until the domain is switched.

## Magic link email template (token_hash)

The app uses **token_hash** (not PKCE) so the link is valid for the full OTP expiry (e.g. 1 hour), not the short PKCE flow state (~10 minutes).

In **Supabase Dashboard** → **Authentication** → **Email Templates** → **Magic Link**, set the link to:

```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email">Log In</a>
```

Use your actual Site URL (e.g. `https://hollyaidapp.netlify.app`). The `{{ .SiteURL }}` variable is filled by Supabase. The callback expects `token_hash` and optionally `type=email` in the query string.

## Magic link expiry (10 minutes)

Login links are sent by Supabase Auth. Expiry is configured in the **Supabase Dashboard**, not in this repo.

To set magic links to expire after **10 minutes**:

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **Authentication** → **Providers** → **Email** (or **Settings**).
3. Look for **"Email OTP expiry"** or **"Magic link expiry"** (in seconds). Set it to **600** (10 minutes).
4. If your plan uses the Management API, you can also set `mailer_otp_exp` to `600` in the auth config.

If the link fails right after clicking, some email providers (e.g. Microsoft Safe Links) prefetch links and consume the one-time token. In that case, use a different email client or ask users to request a new link.

## Magic link "expired or invalid" right after clicking

If the link fails even within 1–2 minutes:

1. **Redirect URL allow list**  
   Supabase must allow your callback URL. In the Dashboard go to **Authentication** → **URL Configuration** and add the callback URL for **each** domain where users actually log in (match exactly, including `https`, no trailing slash). For example:
   - Production: `https://hollyaid.com/auth/callback` or `https://hollyaidapp.netlify.app/auth/callback`
   - Local: `http://localhost:8080/auth/callback`
   - Only add `https://hollyaid.lovable.app/auth/callback` if you use that URL for testing or staging.

2. **Site URL**  
   Set **Site URL** to your main app URL (e.g. `https://hollyaid.com`).

3. **Email link prefetching**  
   Some mail clients or security scanners open links in the background and consume the one-time token. If that happens, the user will see "expired or invalid" when they click. Try from a different email client or request a new link.
