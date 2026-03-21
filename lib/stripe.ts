import Stripe from 'stripe'

const stripeKey = process.env.STRIPE_SECRET_KEY

if (!stripeKey) {
  console.warn('STRIPE_SECRET_KEY is not set. Stripe features will be disabled.')
}

export const stripe = stripeKey 
  ? new Stripe(stripeKey, {
      apiVersion: '2026-02-25.clover',
    })
  : null as any

export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || ''

export const getOrCreateCustomer = async (email: string, userId: string) => {
  if (!stripe) throw new Error('Stripe is not configured')
  
  // Check if customer already exists
  const customers = await stripe.customers.list({
    email,
    limit: 1,
  })

  if (customers.data.length > 0) {
    return customers.data[0]
  }

  // Create new customer
  return await stripe.customers.create({
    email,
    metadata: {
      userId,
    },
  })
}

export const createCheckoutSession = async (customerId: string, userId: string) => {
  if (!stripe) throw new Error('Stripe is not configured')
  
  return await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [
      {
        price: STRIPE_PRICE_ID,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.NEXT_PUBLIC_URL}/pricing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/pricing?canceled=true`,
    metadata: {
      userId,
    },
    subscription_data: {
      metadata: {
        userId,
      },
    },
  })
}

export const createPortalSession = async (customerId: string) => {
  if (!stripe) throw new Error('Stripe is not configured')
  
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_URL}/pricing`,
  })
}
