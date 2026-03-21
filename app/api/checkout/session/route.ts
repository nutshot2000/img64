import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { stripe, getOrCreateCustomer, createCheckoutSession } from '@/lib/stripe'

// Simple in-memory store for subscriptions (replace with database in production)
const subscriptions = new Map()

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'You must be signed in to subscribe' },
        { status: 401 }
      )
    }

    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      )
    }

    const customer = await getOrCreateCustomer(session.user.email, session.user.id || session.user.email)
    const checkoutSession = await createCheckoutSession(customer.id, session.user.id || session.user.email)

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}