// src/lib/paypal.ts
// PayPal utility functions for Next.js 14 App Router
// Implements PayPal Orders v2 API with proper error handling and token management

/**
 * PayPal API configuration from environment variables
 */
const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';

/**
 * Token cache to avoid repeated authentication calls
 */
interface TokenCache {
  access_token: string;
  expires_in: number;
  created_at: number;
}

let tokenCache: TokenCache | null = null;

/**
 * Get PayPal OAuth2 access token
 * Implements PayPal's token endpoint with Basic Authentication
 * Caches token until expiry
 */
export async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (tokenCache) {
    const isExpired = Date.now() > (tokenCache.created_at + (tokenCache.expires_in - 60) * 1000);
    if (!isExpired) {
      return tokenCache.access_token;
    }
  }

  try {
    // Validate credentials
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      console.error('Missing PayPal credentials:');
      console.error('Client ID:', PAYPAL_CLIENT_ID ? 'SET' : 'MISSING');
      console.error('Client Secret:', PAYPAL_CLIENT_SECRET ? 'SET' : 'MISSING');
      throw new Error('PayPal credentials not configured');
    }
    
    // Create Basic Auth header
    const credentials = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
    
    const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PayPal token error:', errorText);
      throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
    }

    const data: TokenCache = await response.json();
    
    // Cache the token with creation timestamp
    tokenCache = {
      ...data,
      created_at: Date.now()
    };

    return data.access_token;
  } catch (error) {
    console.error('Error getting PayPal access token:', error);
    throw new Error('Failed to authenticate with PayPal');
  }
}

/**
 * Create PayPal order
 * Implements PayPal Orders v2 API
 * @param amount - Payment amount as string (e.g., "10.00")
 * @param currency - Currency code (default: "USD")
 */
export async function createPayPalOrder(
  amount: string, 
  currency: string = 'USD',
  email?: string,
  description?: string
): Promise<{ id: string }> {
  try {
    const accessToken = await getAccessToken();
    
    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currency,
            value: amount
          },
          description: description || `Payment from ${email || 'customer'}`
        }],
        payer: email ? {
          email_address: email
        } : undefined
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('PayPal create order error:', errorData);
      throw new Error(`Failed to create order: ${response.status} ${response.statusText}`);
    }

    const orderData = await response.json();
    return { id: orderData.id };
  } catch (error) {
    console.error('Error creating PayPal order:', error);
    throw new Error('Failed to create PayPal order');
  }
}

/**
 * Capture PayPal order
 * Implements PayPal Orders v2 Capture API
 * @param orderID - PayPal order ID
 */
export async function capturePayPalOrder(orderID: string): Promise<{
  success: boolean;
  orderId: string;
  captureId?: string;
  status?: string;
  payerEmail?: string;
  amount?: string;
  currency?: string;
}> {
  try {
    const accessToken = await getAccessToken();
    
    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('PayPal capture error:', errorData);
      throw new Error(`Failed to capture order: ${response.status} ${response.statusText}`);
    }

    const captureData = await response.json();
    
    // Validate capture status
    const purchaseUnit = captureData.purchase_units?.[0];
    const capture = purchaseUnit?.payments?.captures?.[0];
    
    if (!capture || capture.status !== 'COMPLETED') {
      throw new Error('Payment capture was not completed');
    }

    return {
      success: true,
      orderId: captureData.id,
      captureId: capture.id,
      status: capture.status,
      payerEmail: captureData.payer?.email_address,
      amount: capture.amount?.value,
      currency: capture.amount?.currency_code
    };
  } catch (error) {
    console.error('Error capturing PayPal order:', error);
    return {
      success: false,
      orderId: orderID,
      status: 'FAILED'
    };
  }
}

/**
 * Mock risk assessment function
 * In production, integrate with your risk management system
 * @param orderID - PayPal order ID
 * @param amount - Payment amount
 */
export async function callRiskAPI(orderID: string, amount: string): Promise<boolean> {
  try {
    // Log risk check for debugging
    console.log(`[RISK CHECK] Order: ${orderID}, Amount: ${amount}`);
    
    // For small amounts, approve automatically to reduce friction
    const numericAmount = parseFloat(amount);
    if (numericAmount <= 10.00) {
      console.log(`[RISK APPROVED] Small amount transaction: ${amount}`);
      return true;
    }
    
    // For larger amounts, apply risk check
    // Mock implementation - 95% approval rate for amounts > 10
    const shouldApprove = Math.random() > 0.05;
    
    if (!shouldApprove) {
      console.log(`[RISK REJECTED] Order: ${orderID}, Amount: ${amount}`);
      // In production, you would cancel the PayPal order here
      // await cancelPayPalOrder(orderID);
    } else {
      console.log(`[RISK APPROVED] Order: ${orderID}, Amount: ${amount}`);
    }
    
    return shouldApprove;
  } catch (error) {
    console.error('Risk assessment failed:', error);
    // Fail safe - reject risky transactions
    return false;
  }
}

/**
 * Cancel PayPal order (helper function)
 * Used when risk assessment fails
 * @param orderID - PayPal order ID
 */
export async function cancelPayPalOrder(orderID: string): Promise<void> {
  try {
    const accessToken = await getAccessToken();
    
    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        op: 'replace',
        path: '/status',
        value: 'CANCELLED'
      }])
    });

    if (!response.ok) {
      console.error('Failed to cancel PayPal order:', await response.text());
    }
  } catch (error) {
    console.error('Error cancelling PayPal order:', error);
  }
}

/**
 * Verify PayPal webhook signature
 * Required for webhook security
 * @param webhookId - Your PayPal webhook ID
 * @param webhookEvent - The webhook event data
 * @param certUrl - Certificate URL from webhook headers
 * @param transmissionId - Transmission ID from headers
 * @param transmissionTime - Transmission time from headers
 * @param transmissionSig - Transmission signature from headers
 */
export async function verifyWebhookSignature(
  webhookId: string,
  webhookEvent: any,
  certUrl: string,
  transmissionId: string,
  transmissionTime: string,
  transmissionSig: string
): Promise<boolean> {
  try {
    const accessToken = await getAccessToken();
    
    const response = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        webhook_id: webhookId,
        webhook_event: webhookEvent,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_time: transmissionTime,
        transmission_sig: transmissionSig
      })
    });

    if (!response.ok) {
      console.error('Webhook verification failed:', await response.text());
      return false;
    }

    const verificationData = await response.json();
    return verificationData.verification_status === 'SUCCESS';
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}