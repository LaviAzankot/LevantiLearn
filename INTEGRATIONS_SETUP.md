# LevantiLearn — Integrations Setup Guide

Complete setup instructions for RevenueCat (subscriptions) and Social Auth (Google + Apple).

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [RevenueCat Setup](#revenuecat-setup)
4. [Google Sign-In Setup](#google-sign-in-setup)
5. [Apple Sign-In Setup](#apple-sign-in-setup)
6. [Supabase Configuration](#supabase-configuration)
7. [Build & Test](#build--test)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Apple Developer account ($99/yr) — required for Apple Sign-In and iOS App Store
- Google Cloud Console account (free) — required for Google Sign-In
- RevenueCat account (free tier available) — required for subscriptions
- App Store Connect access — required for in-app purchases
- Google Play Console access — required for Android subscriptions
- Expo EAS account — required for building native apps (`npx eas login`)

---

## Environment Variables

Add these to `frontend/.env` (copy from `.env.example`):

```env
# Supabase (already set)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# RevenueCat
EXPO_PUBLIC_RC_API_KEY_IOS=appl_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EXPO_PUBLIC_RC_API_KEY_ANDROID=goog_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> **Where to find these:** RevenueCat Dashboard → Project → API Keys → Public SDK Keys

---

## RevenueCat Setup

### Step 1 — Create a RevenueCat account and project

1. Go to [app.revenuecat.com](https://app.revenuecat.com) and sign up
2. Click **+ New Project** → name it `LevantiLearn`
3. Add **iOS App**: enter bundle ID `com.levantilearn.app`
4. Add **Android App**: enter package name `com.levantilearn.app`

### Step 2 — Create products in App Store Connect (iOS)

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Select your app → **Monetization → In-App Purchases → Subscriptions**
3. Create a **Subscription Group** named `LevantiLearn Premium`
4. Create two auto-renewable subscriptions inside the group:

| Product ID | Reference Name | Duration | Price (suggested) |
|---|---|---|---|
| `arabic_monthly` | Monthly Premium | 1 Month | $9.99 / ₪29.99 |
| `arabic_yearly` | Yearly Premium | 1 Year | $59.99 / ₪199.99 |

5. For **each product**, add a 7-day free trial introductory offer:
   - Monetization → Subscriptions → select product → Introductory Offers → **+**
   - Type: **Free Trial**, Duration: **7 Days**, Customer Eligibility: **New Subscribers**
6. Submit both products for review (or use sandbox for testing)

### Step 3 — Create products in Google Play Console (Android)

1. Go to [play.google.com/console](https://play.google.com/console)
2. Select your app → **Monetize → Products → Subscriptions**
3. Create subscription with Product ID `arabic_monthly`:
   - Base plan ID: `monthly`, Billing period: Monthly, Price: ₪29.99
   - Add free trial: 7 days
4. Create subscription with Product ID `arabic_yearly`:
   - Base plan ID: `yearly`, Billing period: Yearly, Price: ₪199.99
   - Add free trial: 7 days

### Step 4 — Connect products to RevenueCat

1. RevenueCat Dashboard → your project → **Products**
2. Click **+ New Product**:
   - Identifier: `arabic_monthly`, Store: App Store, Type: Auto-Renewable Subscription
3. Click **+ New Product**:
   - Identifier: `arabic_monthly`, Store: Play Store, Type: Auto-Renewable Subscription
4. Repeat for `arabic_yearly` on both stores

### Step 5 — Create the Entitlement

1. RevenueCat Dashboard → **Entitlements** → **+ New Entitlement**
2. Identifier: `premium`
3. Click **Attach** → attach both `arabic_monthly` and `arabic_yearly` products

### Step 6 — Create an Offering

1. RevenueCat Dashboard → **Offerings** → **+ New Offering**
2. Identifier: `default`, Description: `LevantiLearn Premium`
3. Click **+ New Package**:
   - Identifier: `$rc_monthly`, Duration: Monthly → select `arabic_monthly` products
4. Click **+ New Package**:
   - Identifier: `$rc_annual`, Duration: Annual → select `arabic_yearly` products
5. Set the offering as **Current**

### Step 7 — Get API Keys

1. RevenueCat Dashboard → Project Settings → **API Keys**
2. Copy **Apple App Store** public key → `EXPO_PUBLIC_RC_API_KEY_IOS` in `.env`
3. Copy **Google Play Store** public key → `EXPO_PUBLIC_RC_API_KEY_ANDROID` in `.env`

### Step 8 — Connect App Store Connect to RevenueCat

RevenueCat needs server-to-server access to validate receipts.

**iOS:**
1. App Store Connect → Users and Access → **Integrations** → App Store Connect API
2. Generate a key (role: Developer) → download the `.p8` file
3. RevenueCat → Project Settings → **iOS** → paste Issuer ID, Key ID, and `.p8` contents

**Android:**
1. Google Play Console → Setup → **API Access** → link to a Google Cloud project
2. Create a service account with `Financial data viewer` role
3. Download the JSON key file
4. RevenueCat → Project Settings → **Android** → upload the JSON key

---

## Google Sign-In Setup

Google Sign-In uses Supabase as the OAuth broker. You configure OAuth credentials in Google Cloud Console, then paste them into Supabase.

### Step 1 — Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click **Select a project** → **New Project** → name it `LevantiLearn`
3. Enable the **Google+ API** (or People API):
   - APIs & Services → Library → search "Google+ API" → Enable

### Step 2 — Configure the OAuth consent screen

1. APIs & Services → **OAuth consent screen**
2. User Type: **External** → Create
3. Fill in:
   - App name: `LevantiLearn`
   - User support email: your email
   - Developer contact: your email
4. Scopes: add `email`, `profile`, `openid`
5. Save and Continue through all steps

### Step 3 — Create OAuth Client IDs

You need three separate client IDs.

#### Web client (used by Supabase as the broker)

1. APIs & Services → **Credentials** → **+ Create Credentials** → OAuth client ID
2. Application type: **Web application**
3. Name: `LevantiLearn Web`
4. Authorized redirect URIs → **+ Add URI**:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```
   *(Replace `your-project` with your actual Supabase project ref)*
5. Click **Create** → copy the **Client ID** and **Client Secret** — you'll need these for Supabase

#### iOS client

1. **+ Create Credentials** → OAuth client ID
2. Application type: **iOS**
3. Bundle ID: `com.levantilearn.app`
4. Click **Create** → copy the **Client ID** (looks like `xxx.apps.googleusercontent.com`)

#### Android client

1. **+ Create Credentials** → OAuth client ID
2. Application type: **Android**
3. Package name: `com.levantilearn.app`
4. SHA-1 certificate fingerprint: run this command and paste the output:
   ```bash
   cd frontend
   npx expo credentials:manager   # choose Android → Keystore → shows SHA-1
   # OR for debug builds:
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
5. Click **Create**

### Step 4 — Add Google credentials to Supabase

1. Supabase Dashboard → **Authentication** → **Providers** → **Google**
2. Toggle **Enable Sign in with Google**
3. Paste the **Web Client ID** and **Web Client Secret** from Step 3
4. Click **Save**

---

## Apple Sign-In Setup

### Step 1 — Enable Sign In with Apple for your App ID

1. Go to [developer.apple.com](https://developer.apple.com) → **Certificates, IDs & Profiles**
2. **Identifiers** → click your App ID (`com.levantilearn.app`)
3. Scroll to **Sign In with Apple** → check the box → **Edit**
4. Select **Enable as a primary App ID** → **Save**
5. Click **Save** on the main page

### Step 2 — Create a Services ID (for Supabase callback)

1. **Identifiers** → **+** → select **Services IDs** → Continue
2. Description: `LevantiLearn Sign In`
3. Identifier: `com.levantilearn.app.web` (must be different from bundle ID)
4. Register → click the new Services ID → enable **Sign In with Apple** → **Configure**
5. Primary App ID: select `com.levantilearn.app`
6. Domains: `your-project.supabase.co`
7. Return URLs:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```
8. **Save** → **Continue** → **Register**

### Step 3 — Create a private key

1. **Keys** → **+** → name it `LevantiLearn Sign In with Apple`
2. Enable **Sign In with Apple** → **Configure** → select your primary App ID
3. **Continue** → **Register**
4. **Download** the `.p8` key file (you can only download it once — keep it safe!)
5. Note your **Key ID** (shown on the key detail page)
6. Note your **Team ID** (shown at the top right of the developer portal, or under Membership)

### Step 4 — Add Apple credentials to Supabase

1. Supabase Dashboard → **Authentication** → **Providers** → **Apple**
2. Toggle **Enable Sign in with Apple**
3. Fill in:
   - **Service ID**: `com.levantilearn.app.web` (the Services ID from Step 2)
   - **Team ID**: your 10-character team ID
   - **Key ID**: from the key you created
   - **Private Key**: open the `.p8` file in a text editor, paste the full contents including the header/footer lines
4. **Save**

---

## Supabase Configuration

### Redirect URLs

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. **Site URL**: `levantilearn://` (your app scheme)
3. **Redirect URLs** → Add all of these:

```
levantilearn://auth/callback
exp://127.0.0.1:8081/--/auth/callback
exp://192.168.1.x:8081/--/auth/callback
https://your-project.supabase.co/auth/v1/callback
```

> The `exp://` URLs are for local development with Expo Go. Replace `192.168.1.x` with your machine's local IP when testing on a physical device.

### Profiles table

Make sure your `profiles` table is set up to auto-create on signup. If not already done, run this in the Supabase SQL editor:

```sql
-- Auto-create a profile row when a new auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, is_premium, xp_total, streak_days, daily_goal_minutes)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    false,
    0,
    0,
    10
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Trigger on every new auth user
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

## Build & Test

### Install packages and rebuild native code

```bash
cd frontend

# Install new packages
npm install

# Regenerate native iOS/Android projects (required after adding native plugins)
npx expo prebuild --clean

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android
```

> **Note:** `react-native-purchases`, `expo-apple-authentication`, and the OAuth packages all contain native code. They **will not work in Expo Go** — you must use a local build (`expo run:ios`) or an EAS build.

### Test RevenueCat in sandbox

- **iOS:** Use a Sandbox tester account created in App Store Connect → Users and Access → Sandbox Testers. Sign out of your real Apple ID on the device, then sign in with the sandbox account when prompted during purchase.
- **Android:** Use a licensed tester email in Google Play Console → Setup → License Testing.
- RevenueCat Dashboard → Customer Lookup → search for your test user to verify entitlements.

### Test Google Sign-In

- Works on both iOS simulator and Android emulator once credentials are configured.
- If the browser opens but returns an error, double-check the redirect URL matches exactly what's in Google Cloud Console and Supabase.

### Test Apple Sign-In

- Apple Sign-In only works on a **physical iOS device** or **Xcode 13+ simulator** (iOS 13+).
- It does **not** work on Android.
- First login will prompt for name/email sharing; subsequent logins are silent.

### EAS Production Build

```bash
# Configure EAS (first time only)
npx eas build:configure

# Build for both platforms
npx eas build --platform all

# Submit to stores
npx eas submit --platform ios
npx eas submit --platform android
```

---

## Troubleshooting

### RevenueCat: "No offerings found"
- Confirm products are live (or in sandbox) in App Store Connect / Google Play Console.
- Check that the Offering is set as **Current** in the RevenueCat dashboard.
- Make sure the API key matches the platform (`appl_` prefix = iOS, `goog_` = Android).
- Products can take up to 24h to propagate from App Store Connect to RevenueCat.

### RevenueCat: "Purchase failed" in sandbox
- Make sure you're signed into a Sandbox tester account (not a real Apple ID).
- Reset sandbox subscriptions: Settings → App Store → Sandbox Account → Manage.

### Google Sign-In: browser opens but redirects to an error page
- The redirect URL in Google Cloud Console must exactly match what `Linking.createURL('auth/callback')` returns for your build type.
- For production builds: `levantilearn://auth/callback`
- For Expo Go: `exp://127.0.0.1:8081/--/auth/callback`
- Add both to Google Cloud Console → Authorized redirect URIs AND to Supabase → Redirect URLs.

### Google Sign-In: "redirect_uri_mismatch"
- You used the iOS/Android client ID in Supabase instead of the **Web** client ID. Supabase always uses the web client to broker OAuth — the mobile client IDs are only needed for native Google SDKs (which we are not using here).

### Apple Sign-In: "Invalid client"
- Double-check that the **Services ID** (`com.levantilearn.app.web`) — not the bundle ID — is entered in Supabase.
- Confirm the domain `your-project.supabase.co` is verified in the Services ID configuration.

### Apple Sign-In: not showing the button
- Apple Sign-In is only shown when `isAvailableAsync()` returns `true`, which requires iOS 13+ and a signed-in Apple ID on the device.
- It will never show on Android — this is expected.

### "expo-apple-authentication could not be found"
- Run `npx expo prebuild` then `npx expo run:ios`. This module requires native compilation and won't work in Expo Go.

### Supabase session not created after OAuth
- Ensure `flowType: 'pkce'` is set in `src/lib/supabase.ts` (already done).
- Log `result.url` after `WebBrowser.openAuthSessionAsync` to confirm it contains a `code=` parameter.
- Call `supabase.auth.exchangeCodeForSession(result.url)` only when `result.type === 'success'`.
