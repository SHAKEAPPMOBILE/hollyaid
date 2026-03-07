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

## Magic link expiry (10 minutes)

Login links are sent by Supabase Auth. Expiry is configured in the **Supabase Dashboard**, not in this repo.

To set magic links to expire after **10 minutes**:

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **Authentication** → **Providers** → **Email** (or **Settings**).
3. Look for **"Email OTP expiry"** or **"Magic link expiry"** (in seconds). Set it to **600** (10 minutes).
4. If your plan uses the Management API, you can also set `mailer_otp_exp` to `600` in the auth config.

If the link fails right after clicking, some email providers (e.g. Microsoft Safe Links) prefetch links and consume the one-time token. In that case, use a different email client or ask users to request a new link.
