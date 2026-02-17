// src/app/api/paypal/capture-order/route.ts
// PayPal Capture Order API Route
// Handles payment capture after user approval

import { NextRequest, NextResponse } from 'next/server';
import { capturePayPalOrder } from '@/lib/paypal';

/**
 * POST /api/paypal/capture-order
 * Captures a PayPal order after user approval
 * 
 * Request body:
 * {
 *   "orderID": "PAYPAL_ORDER_ID"
 * }
 * 
 * Response (success):
 * {
 *   "success": true,
 *   "orderId": "PAYPAL_ORDER_ID",
 *   "captureId": "CAPTURE_ID",
 *   "status": "COMPLETED",
 *   "payerEmail": "user@example.com",
 *   "amount": "10.00",
 *   "currency": "GBP"
 * }
 * 
 * Response (failure):
 * {
 *   "success": false,
 *   "error": "error message"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { orderID } = body;

    // Validate input
    if (!orderID) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Log the request for debugging
    console.log(`[CAPTURE ORDER] Order ID: ${orderID}`);

    // Validate order ID format (PayPal order IDs are typically alphanumeric)
    if (!/^[A-Z0-9]+$/.test(orderID)) {
      return NextResponse.json(
        { success: false, error: 'Invalid order ID format' },
        { status: 400 }
      );
    }

    // Capture the PayPal order
    const captureResult = await capturePayPalOrder(orderID);
    
    if (!captureResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to capture payment' 
        },
        { status: 400 }
      );
    }

    // Return successful capture response
    return NextResponse.json({
      success: true,
      orderId: captureResult.orderId,
      captureId: captureResult.captureId,
      status: captureResult.status,
      payerEmail: captureResult.payerEmail,
      amount: captureResult.amount,
      currency: captureResult.currency
    });

  } catch (error: any) {
    console.error('Capture order API error:', error);
    
    // Return structured error response
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to capture PayPal order' 
      },
      { status: 500 }
    );
  }
}