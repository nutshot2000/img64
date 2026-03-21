import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

// In-memory subscription store (replace with database in production)
const subscriptions = new Map()

export async function POST(req: NextRequest) {
  // Return early if Stripe is not configured
  if (!stripe || !webhookSecret) {
    console.warn('Stripe not configured, skipping webhook processing')
    return NextResponse.json({ received: true, note: 'Stripe not configured' })
  }

  try {
    const payload = await req.text()
    const signature = req.headers.get('stripe-signature') || ''

    let event: any

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        
        if (session.subscription) {
          const subscription: any = await stripe.subscriptions.retrieve(session.subscription)
          const userId = session.metadata?.userId
          
          if (userId) {
            subscriptions.set(userId, {
              stripeCustomerId: subscription.customer as string,
              stripeSubscriptionId: subscription.id,
              status: subscription.status,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            })
          }
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        
        if (invoice.subscription) {
          const subscription: any = await stripe.subscriptions.retrieve(invoice.subscription)
          
          // Update subscription status
          subscriptions.forEach((sub, userId) => {
            if (sub.stripeSubscriptionId === subscription.id) {
              subscriptions.set(userId, {
                ...sub,
                status: subscription.status,
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              })
            }
          })
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription: any = event.data.object
        
        // Update subscription status
        subscriptions.forEach((sub, userId) => {
          if (sub.stripeSubscriptionId === subscription.id) {
            subscriptions.set(userId, {
              ...sub,
              status: subscription.status,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            })
          }
        })
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
