// src/app/checkout/page.tsx
// PayPal Smart Payment Button Integration Page
// Implements PayPal JavaScript SDK with React components

'use client';

import { useState, useEffect } from 'react';

// PayPal SDK types
declare global {
  interface Window {
    paypal: any;
  }
}

interface PaymentResult {
  success: boolean;
  orderId?: string;
  captureId?: string;
  status?: string;
  payerEmail?: string;
  amount?: string;
  currency?: string;
  error?: string;
}

export default function CheckoutPage() {
  const [email, setEmail] = useState<string>('');
  const [amount, setAmount] = useState<string>('10.00');
  const [currency, setCurrency] = useState<string>('USD');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false); // Prevent duplicate requests

  // PayPal supported currencies
  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
    { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  ];

  const selectedCurrency = currencies.find(c => c.code === currency) || currencies[0];
  const isFormValid = email && amount && parseFloat(amount) > 0 && email.includes('@');

  // Currency symbol mapping for display
  const getCurrencySymbol = (currencyCode: string) => {
    const symbols: Record<string, string> = {
      'USD': '$',
      'GBP': '£',
      'EUR': '€',
      'AUD': 'A$',
      'CAD': 'C$',
      'JPY': '¥',
      'CNY': '¥',
      'INR': '₹',
      'BRL': 'R$',
      'MXN': '$'
    };
    return symbols[currencyCode] || currencyCode;
  };

  // Load PayPal SDK dynamically
  useEffect(() => {
    if (!isFormValid) return;
    
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&currency=${currency}`;
    script.async = true;
    
    script.onload = () => {
      if (window.paypal) {
        initializePayPal();
      }
    };
    
    script.onerror = () => {
      setError('Failed to load PayPal SDK');
    };
    
    // Remove existing script if any
    const existingScript = document.querySelector('script[src*="paypal.com/sdk/js"]');
    if (existingScript) {
      existingScript.remove();
    }
    
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, [isFormValid, currency]);

  /**
   * Initialize PayPal Smart Payment Buttons
   */
  const initializePayPal = () => {
    if (!window.paypal) return;

    window.paypal.Buttons({
      // Create order callback
      createOrder: async (data: any, actions: any) => {
        // Prevent duplicate requests
        if (isProcessing) {
          throw new Error('Payment is already being processed');
        }
        
        setIsLoading(true);
        setIsProcessing(true);
        setError(null);
        setPaymentResult(null);

        try {
          // Validate PayPal client ID is set
          if (!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID) {
            throw new Error('PayPal configuration error: Client ID not found');
          }
          
          const response = await fetch('/api/paypal/create-order', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              amount,
              currency,
              email,
              description: `Payment from ${email}`
            }),
          });

          const orderData = await response.json();

          if (!orderData.success) {
            throw new Error(orderData.error || 'Failed to create order');
          }

          return orderData.orderID;
        } catch (err: any) {
          setError(err.message || 'Failed to create PayPal order');
          throw err;
        } finally {
          setIsLoading(false);
          setIsProcessing(false);
        }
      },

      // On approve callback
      onApprove: async (data: any, actions: any) => {
        // Prevent duplicate capture requests
        if (isProcessing) {
          setError('Payment is already being processed');
          return;
        }
        
        setIsLoading(true);
        setIsProcessing(true);
        setError(null);

        try {
          const response = await fetch('/api/paypal/capture-order', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ orderID: data.orderID }),
          });

          const captureData = await response.json();

          if (!captureData.success) {
            throw new Error(captureData.error || 'Failed to capture payment');
          }

          setPaymentResult({
            success: true,
            orderId: captureData.orderId,
            captureId: captureData.captureId,
            status: captureData.status,
            payerEmail: captureData.payerEmail,
            amount: captureData.amount,
            currency: captureData.currency
          });

        } catch (err: any) {
          setError(err.message || 'Failed to capture payment');
        } finally {
          setIsLoading(false);
          setIsProcessing(false);
        }
      },

      // On cancel callback
      onCancel: (data: any) => {
        setError('Payment was cancelled');
        setIsLoading(false);
      },

      // On error callback
      onError: (err: any) => {
        setError('Payment error occurred');
        setIsLoading(false);
        console.error('PayPal error:', err);
      },

      // Styling options
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'paypal'
      }
    }).render('#paypal-button-container');
  };

  /**
   * Handle amount change
   */
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Validate numeric input with up to 2 decimal places
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8 text-white">
            <h1 className="text-3xl font-bold mb-2">Complete Your Payment</h1>
            <p className="text-blue-100">Secure checkout with PayPal</p>
          </div>

          <div className="p-6">
            {/* Email Input */}
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Your Email Address *
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                required
              />
            </div>

            {/* Amount and Currency Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                    {selectedCurrency.symbol}
                  </span>
                  <input
                    id="amount"
                    type="text"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0.00"
                    className="block w-full pl-8 pr-12 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg text-black"
                    required
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500">
                    {currency}
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
                  Currency *
                </label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                >
                  {currencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Amount Display */}
            {amount && parseFloat(amount) > 0 && (
              <div className="mb-8 bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600 mb-1">You will pay</p>
                <p className="text-2xl font-bold text-blue-600">
                  {selectedCurrency.symbol}{parseFloat(amount).toFixed(2)} {currency}
                </p>
              </div>
            )}

            {/* PayPal Button Container */}
            <div className="mb-8">
              <div id="paypal-button-container" className="max-w-md mx-auto">
                {!isFormValid && (
                  <div className="text-center py-8 text-gray-500">
                    <p>Please enter your email and amount to continue</p>
                  </div>
                )}
                
                {isLoading && (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Processing...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Payment Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {paymentResult?.success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Payment Successful!</h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>Thank you for your payment.</p>
                      <div className="mt-2 space-y-1">
                        <p><span className="font-medium">Order ID:</span> {paymentResult.orderId}</p>
                        <p><span className="font-medium">Amount:</span> {getCurrencySymbol(paymentResult.currency || 'USD')}{paymentResult.amount} {paymentResult.currency}</p>
                        <p><span className="font-medium">Status:</span> {paymentResult.status}</p>
                        {paymentResult.payerEmail && (
                          <p><span className="font-medium">Payer:</span> {paymentResult.payerEmail}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Payment Information</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-center">
                  <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Secure PayPal checkout
                </li>
                <li className="flex items-center">
                  <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Instant payment processing
                </li>
                <li className="flex items-center">
                  <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Protected by PayPal Buyer Protection
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}