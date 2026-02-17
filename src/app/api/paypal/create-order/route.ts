// src/app/api/paypal/create-order/route.ts
// PayPal Create Order API Route
// Handles order creation with risk assessment

import { NextRequest, NextResponse } from 'next/server';
import { createPayPalOrder, callRiskAPI, cancelPayPalOrder } from '@/lib/paypal';

/**
 * POST /api/paypal/create-order
 * Creates a PayPal order after risk assessment
 * 
 * Request body:
 * {
 *   "amount": "10.00"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "orderID": "PAYPAL_ORDER_ID"
 * }
 * 
 * or
 * {
 *   "success": false,
 *   "error": "error message"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { amount, currency = 'USD', email, description } = body;

    // Validate input
    if (!amount) {
      return NextResponse.json(
        { success: false, error: 'Amount is required' },
        { status: 400 }
      );
    }

    // Log the request for debugging
    console.log(`[CREATE ORDER] Amount: ${amount}, Currency: ${currency}, Email: ${email}`);

    // Validate amount format (numeric string)
    if (!/^\d+(\.\d{2})?$/.test(amount)) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount format. Use format like "10.00"' },
        { status: 400 }
      );
    }

    // Validate email if provided
    if (email && !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create PayPal order
    const order = await createPayPalOrder(amount, currency, email, description);
    
    // Perform risk assessment
    const isApproved = await callRiskAPI(order.id, amount);
    
    if (!isApproved) {
      // Risk check failed - cancel the order
      await cancelPayPalOrder(order.id);
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Transaction not approved due to risk assessment' 
        },
        { status: 403 }
      );
    }

    // Return successful response
    return NextResponse.json({
      success: true,
      orderID: order.id
    });

  } catch (error: any) {
    console.error('Create order API error:', error);
    
    // Return structured error response
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create PayPal order' 
      },
      { status: 500 }
    );
  }
}