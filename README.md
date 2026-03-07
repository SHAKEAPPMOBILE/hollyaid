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

The **login link in the email** sends users to the URL configured when the app was built. If you deploy on **Netlify** and want the link to open your Netlify app (not Lovable), set this in **Netlify**:

1. Netlify Dashboard → **hollyaidapp** → **Site configuration** → **Environment variables** (or **Project configuration** → **Environment**).
2. Add a variable:
   - **Key:** `VITE_AUTH_REDIRECT_URL`
   - **Value:** your production callback URL, e.g. `https://hollyaidapp.netlify.app` or `https://hollyaid.com` (no trailing slash; the code adds `/auth/callback`).
3. **Redeploy** the site so the new value is baked into the build.

After that, new magic-link emails will point to that URL, so users land on your Netlify (or custom domain) app instead of Lovable. Supabase **Redirect URLs** must still include that same URL (e.g. `https://hollyaidapp.netlify.app/auth/callback`).

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
