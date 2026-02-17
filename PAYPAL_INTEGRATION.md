# PayPal Smart Payment Button Integration

A production-ready PayPal integration for Next.js 14 using App Router, TypeScript, and native fetch API.

## 🚀 Features

- **Next.js 14 App Router** with Server Components
- **TypeScript** everywhere with strict typing
- **Native fetch API** (no axios or third-party SDKs)
- **PayPal Orders v2 API** compliance
- **Risk assessment integration** with automatic order cancellation
- **Webhook handling** with signature verification
- **Secure token management** with caching
- **Responsive UI** with PayPal Smart Payment Buttons
- **Production-ready error handling**

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── paypal/
│   │       ├── create-order/route.ts     # Create PayPal order
│   │       ├── capture-order/route.ts    # Capture payment
│   │       └── webhook/route.ts          # Webhook handler
│   └── checkout/
│       └── page.tsx                      # Checkout UI
└── lib/
    └── paypal.ts                         # PayPal utility functions
```

## 🔧 Environment Variables

Create a `.env.local` file with your PayPal credentials:

```env
# PayPal Sandbox Credentials
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_secret
PAYPAL_API_BASE=https://api-m.sandbox.paypal.com

# PayPal Client ID for Frontend (NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_sandbox_client_id

# PayPal Webhook ID (from PayPal Developer Dashboard)
PAYPAL_WEBHOOK_ID=your_webhook_id
```

## 🛠️ Setup Instructions

1. **Get PayPal Credentials**
   - Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
   - Create a sandbox account
   - Get your Client ID and Secret

2. **Configure Webhook** (Optional but recommended)
   - In PayPal Developer Dashboard, create a webhook
   - Add endpoint: `https://your-domain.com/api/paypal/webhook`
   - Subscribe to events: `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`
   - Add the webhook ID to your environment variables

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

5. **Access Checkout Page**
   Open [http://localhost:3000/checkout](http://localhost:3000/checkout)

## 📋 API Endpoints

### POST `/api/paypal/create-order`
Creates a PayPal order with risk assessment

**Request:**
```json
{
  "amount": "10.00"
}
```

**Response (Success):**
```json
{
  "success": true,
  "orderID": "PAYPAL_ORDER_ID"
}
```

### POST `/api/paypal/capture-order`
Captures a PayPal payment

**Request:**
```json
{
  "orderID": "PAYPAL_ORDER_ID"
}
```

**Response (Success):**
```json
{
  "success": true,
  "orderId": "PAYPAL_ORDER_ID",
  "captureId": "CAPTURE_ID",
  "status": "COMPLETED",
  "payerEmail": "user@example.com",
  "amount": "10.00"
}
```

### POST `/api/paypal/webhook`
Handles PayPal webhook events

Processes events like:
- `CHECKOUT.ORDER.APPROVED`
- `PAYMENT.CAPTURE.COMPLETED`
- `PAYMENT.CAPTURE.REFUNDED`
- `PAYMENT.CAPTURE.REVERSED`

## 🔒 Security Features

- **Token Caching**: OAuth2 tokens cached with automatic refresh
- **Signature Verification**: Webhook signatures verified before processing
- **Input Validation**: Strict validation on all API inputs
- **Error Sanitization**: Sensitive information not exposed to frontend
- **Risk Assessment**: Mock risk check with automatic order cancellation

## 🎯 PayPal Integration Flow

1. **User enters amount** on checkout page
2. **Create Order**: Frontend calls `/api/paypal/create-order`
3. **Risk Check**: Server performs risk assessment
4. **PayPal SDK**: Loads PayPal buttons dynamically
5. **User Approval**: User completes payment in PayPal popup
6. **Capture Payment**: Frontend calls `/api/paypal/capture-order`
7. **Confirmation**: User sees success message with payment details

## 🚨 Error Handling

All API routes include:
- Try/catch blocks
- Structured JSON error responses
- Proper HTTP status codes
- Server-side logging
- Client-side error display

## 📦 Production Deployment

1. **Update Environment Variables**
   - Use production PayPal credentials
   - Update `PAYPAL_API_BASE` to live endpoint
   - Configure proper webhook URL

2. **Build and Deploy**
   ```bash
   npm run build
   npm start
   ```

3. **SSL Required**
   - PayPal requires HTTPS for production
   - Webhooks must use HTTPS endpoints

## 🧪 Testing

- Use PayPal sandbox credentials for testing
- Test different payment scenarios
- Verify webhook delivery in PayPal dashboard
- Check error handling with invalid inputs

## 📚 PayPal Documentation

- [PayPal Orders v2 API](https://developer.paypal.com/docs/api/orders/v2/)
- [PayPal JavaScript SDK](https://developer.paypal.com/docs/checkout/)
- [Webhook Notifications](https://developer.paypal.com/docs/api/webhooks/v1/)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## 📄 License

MIT License