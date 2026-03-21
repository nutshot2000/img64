# IMG64.DEV Pro Tier Setup

## What Was Built

This is a complete monetization system for img64.dev with the following features:

### 🎯 Pricing Tiers
- **Free**: 10 conversions/day, single file upload, standard compression (80%)
- **Pro**: £9/month, unlimited conversions, batch upload, high-quality compression (90-100%), no ads

### 🔐 Authentication
- NextAuth with Google OAuth
- NextAuth with GitHub OAuth
- JWT-based sessions

### 💳 Stripe Integration
- Checkout session creation
- Webhook handling for subscription events
- Customer portal for managing subscriptions
- In-memory subscription tracking (upgrade to database for production)

### 📊 Usage Tracking
- localStorage-based free tier counting
- Daily reset at midnight
- Visual progress bar showing usage
- Lockout when limit reached

### ✨ Pro Features
- Batch upload (multiple files at once)
- Higher quality compression (90-100% for Pro vs 50-80% for free)
- Higher resolution support (8192px for Pro vs 4096px for free)
- Larger file support (5MB for Pro vs 1MB for free)
- No ads

## Files Created

```
/lib/
  stripe.ts          # Stripe client and helper functions
  auth.ts            # NextAuth configuration
  usage.ts           # Free tier usage tracking

/app/api/
  auth/[...nextauth]/route.ts    # NextAuth API route
  checkout/session/route.ts      # Stripe checkout session
  webhooks/stripe/route.ts       # Stripe webhook handler
  portal/route.ts                # Stripe customer portal

/app/
  pricing/page.tsx   # Pricing page with Stripe checkout
  page.tsx           # Updated main page with usage tracking
  layout.tsx         # Updated with SessionProvider

/components/
  UsageTracker.tsx   # Usage display component
  ProBadge.tsx       # Pro badge and feature lock component
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-random-secret-min-32-characters-long"

# OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# OAuth (get from GitHub Settings)
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."

# Stripe (get from Stripe Dashboard)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID="price_..."

NEXT_PUBLIC_URL="http://localhost:3000"
```

## Setup Instructions

### 1. Generate NextAuth Secret
```bash
openssl rand -base64 32
```
Or use any random string generator for at least 32 characters.

### 2. Stripe Setup
1. Create a Stripe account at https://stripe.com
2. Create a product with a monthly subscription price (£9)
3. Get your API keys from the Dashboard
4. Set up webhook endpoint: `https://yourdomain.com/api/webhooks/stripe`
5. Get the webhook signing secret

### 3. OAuth Setup

**Google:**
1. Go to https://console.cloud.google.com
2. Create a project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID
4. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

**GitHub:**
1. Go to Settings → Developer settings → OAuth Apps
2. Create new OAuth App
3. Set Authorization callback URL: `http://localhost:3000/api/auth/callback/github`

### 4. Run Development Server
```bash
npm run dev
```

### 5. Test Stripe Webhooks Locally
Install Stripe CLI: https://stripe.com/docs/stripe-cli

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Testing the Payment Flow

1. Sign in with Google or GitHub
2. Go to /pricing
3. Click "Upgrade to Pro"
4. Use Stripe test card: `4242 4242 4242 4242`
5. Any future date, any CVC, any ZIP
6. Success! You're now Pro

## Deployment

### Vercel
1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy!

### Stripe Webhook for Production
Update webhook endpoint to your production URL:
`https://yourdomain.com/api/webhooks/stripe`

## Production Considerations

⚠️ **Important**: This MVP uses in-memory storage for subscriptions. For production:

1. **Add a database** (PostgreSQL, MySQL, or MongoDB)
2. **Store subscriptions persistently** 
3. **Add subscription status checks** on page load
4. **Add webhook verification** for security

Recommended database setup:
```bash
npm install @prisma/client prisma
npx prisma init
```

## Next Steps

1. ✅ Set up Stripe account and get API keys
2. ✅ Set up Google OAuth credentials  
3. ✅ Set up GitHub OAuth app
4. ✅ Test payment flow
5. 🔄 Add database for persistent subscriptions
6. 🔄 Add analytics tracking
7. 🔄 Set up email notifications for new subscribers
8. 🔄 Add team/organization plans

## Notes

- The free tier uses localStorage, so it's per-browser (not perfect but works for MVP)
- Subscriptions are stored in memory and will reset on server restart
- For production, move subscription tracking to a database
- Stripe webhooks must be properly configured for subscription status updates
- Make sure to set STRIPE_WEBHOOK_SECRET for webhook verification
