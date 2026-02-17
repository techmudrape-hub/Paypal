// src/app/api/paypal/webhook/route.ts
// PayPal Webhook Handler
// Processes PayPal webhook events for payment notifications

import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/paypal';

// Webhook ID from your PayPal developer dashboard
// In production, store this in environment variables
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || '';

/**
 * POST /api/paypal/webhook
 * Handles PayPal webhook events
 * 
 * Verifies webhook signature and processes payment events
 */
export async function POST(request: NextRequest) {
  try {
    // Get webhook headers
    const transmissionId = request.headers.get('paypal-transmission-id');
    const transmissionTime = request.headers.get('paypal-transmission-time');
    const certUrl = request.headers.get('paypal-cert-url');
    const transmissionSig = request.headers.get('paypal-transmission-sig');
    const authAlgorithm = request.headers.get('paypal-auth-algorithm');

    // Validate required headers
    if (!transmissionId || !transmissionTime || !certUrl || !transmissionSig) {
      console.error('Missing required webhook headers');
      return NextResponse.json(
        { error: 'Missing webhook headers' },
        { status: 400 }
      );
    }

    // Parse webhook event body
    const webhookEvent = await request.json();
    
    // Log incoming webhook for debugging
    console.log('Received PayPal webhook:', {
      eventType: webhookEvent.event_type,
      resourceId: webhookEvent.resource?.id,
      transmissionId
    });

    // Verify webhook signature for security
    const isValid = await verifyWebhookSignature(
      PAYPAL_WEBHOOK_ID,
      webhookEvent,
      certUrl,
      transmissionId,
      transmissionTime,
      transmissionSig
    );

    if (!isValid) {
      console.error('Webhook signature verification failed');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // Process different webhook event types
    switch (webhookEvent.event_type) {
      case 'CHECKOUT.ORDER.APPROVED':
        // Order approved but not yet captured
        console.log('Order approved:', webhookEvent.resource.id);
        // Add your business logic here
        // e.g., update order status in database
        break;

      case 'PAYMENT.CAPTURE.COMPLETED':
        // Payment successfully captured
        const capture = webhookEvent.resource;
        console.log('Payment captured:', {
          captureId: capture.id,
          orderId: capture.supplementary_data?.related_ids?.order_id,
          amount: capture.amount?.value,
          currency: capture.amount?.currency_code,
          payerEmail: capture.payer_email,
          status: capture.status
        });
        
        // Add your business logic here
        // e.g., fulfill order, send confirmation email, update database
        break;

      case 'PAYMENT.CAPTURE.REFUNDED':
        // Payment was refunded
        console.log('Payment refunded:', webhookEvent.resource.id);
        // Add your business logic here
        break;

      case 'PAYMENT.CAPTURE.REVERSED':
        // Payment was reversed
        console.log('Payment reversed:', webhookEvent.resource.id);
        // Add your business logic here
        break;

      default:
        // Log unhandled event types for monitoring
        console.log('Unhandled webhook event:', webhookEvent.event_type);
        break;
    }

    // Return success response
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Webhook handler error:', error);
    
    // Return error response
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/paypal/webhook
 * Webhook verification endpoint (used by PayPal during webhook registration)
 */
export async function GET() {
  return NextResponse.json({ 
    message: 'PayPal webhook endpoint is active' 
  });
}