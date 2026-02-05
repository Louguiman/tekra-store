# WhatsApp Business API Setup Guide

## Overview

This application uses the **WhatsApp Business API (Cloud API)** to enable suppliers to submit product information directly via WhatsApp messages. The system automatically processes text, images, PDFs, and voice messages to extract product data.

## Architecture

```
Supplier WhatsApp → Meta Cloud API → Webhook → Backend → AI Processing → Validation → Inventory
```

## Prerequisites

1. **Meta Business Account** - [business.facebook.com](https://business.facebook.com)
2. **WhatsApp Business Account** - Linked to your Meta Business Account
3. **Meta Developer Account** - [developers.facebook.com](https://developers.facebook.com)
4. **Phone Number** - A phone number to use for WhatsApp Business (not your personal number)
5. **Public HTTPS Endpoint** - For webhook (use ngrok for development)

## Step 1: Create a Meta App

### 1.1 Create App on Meta for Developers

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click **"My Apps"** → **"Create App"**
3. Select **"Business"** as the app type
4. Fill in app details:
   - **App Name**: Your E-commerce Platform
   - **App Contact Email**: your-email@example.com
   - **Business Account**: Select your business account
5. Click **"Create App"**

### 1.2 Add WhatsApp Product

1. In your app dashboard, find **"WhatsApp"** in the products list
2. Click **"Set Up"**
3. Select your **Business Portfolio**
4. Click **"Continue"**

## Step 2: Get API Credentials

### 2.1 Get Access Token

1. In WhatsApp → **Getting Started**
2. Find **"Temporary access token"** (valid for 24 hours)
3. For production, generate a **Permanent Token**:
   - Go to **System Users** in Business Settings
   - Create a new system user
   - Assign **WhatsApp Business Management** permission
   - Generate a token with these permissions:
     - `whatsapp_business_management`
     - `whatsapp_business_messaging`

### 2.2 Get Phone Number ID

1. In WhatsApp → **API Setup**
2. Find **"Phone number ID"** under your test number
3. Copy this ID (format: `123456789012345`)

### 2.3 Get WhatsApp Business Account ID

1. In WhatsApp → **API Setup**
2. Find **"WhatsApp Business Account ID"**
3. Copy this ID (format: `123456789012345`)

### 2.4 Get App ID and App Secret

1. Go to **Settings** → **Basic**
2. Copy **App ID**
3. Click **Show** next to **App Secret** and copy it

## Step 3: Configure Webhook

### 3.1 Setup Webhook URL

For development, use **ngrok**:
```bash
# Install ngrok
npm install -g ngrok

# Start your backend server
npm run start:dev

# In another terminal, expose your local server
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

For production, use your actual domain:
```
https://yourdomain.com
```

### 3.2 Configure Webhook in Meta

1. In WhatsApp → **Configuration**
2. Click **"Edit"** next to Webhook
3. Enter your webhook URL:
   ```
   https://yourdomain.com/whatsapp/webhook
   ```
4. Enter **Verify Token** (create a random string, e.g., `my_secure_verify_token_12345`)
5. Click **"Verify and Save"**

### 3.3 Subscribe to Webhook Fields

Subscribe to these webhook fields:
- ✅ **messages** - Receive incoming messages
- ✅ **message_status** - Track message delivery status

## Step 4: Environment Variables

Add these variables to your `.env` file:

```env
# ============================================
# WhatsApp Business API Configuration
# ============================================

# Meta App Credentials
WHATSAPP_APP_ID=your_app_id_here
WHATSAPP_APP_SECRET=your_app_secret_here

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=your_permanent_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id_here

# Webhook Configuration
WHATSAPP_VERIFY_TOKEN=my_secure_verify_token_12345
WHATSAPP_WEBHOOK_SECRET=your_webhook_secret_here

# API Version (recommended: v18.0 or later)
WHATSAPP_API_VERSION=v18.0

# Base URL for WhatsApp API
WHATSAPP_API_URL=https://graph.facebook.com

# Media Storage Configuration
WHATSAPP_MEDIA_STORAGE_PATH=./uploads/whatsapp
WHATSAPP_MAX_FILE_SIZE=16777216  # 16MB in bytes

# Rate Limiting (messages per second)
WHATSAPP_RATE_LIMIT=80  # Cloud API allows 80 msg/sec

# ============================================
# AI Processing Configuration (Optional)
# ============================================

# OpenAI for text extraction
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4-turbo-preview

# Alternative: Ollama for local AI processing
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2

# ============================================
# Feature Flags
# ============================================

# Enable/disable WhatsApp integration
WHATSAPP_ENABLED=true

# Enable auto-approval for trusted suppliers
WHATSAPP_AUTO_APPROVE_ENABLED=true
WHATSAPP_AUTO_APPROVE_THRESHOLD=0.9  # 90% confidence

# Enable media processing
WHATSAPP_PROCESS_IMAGES=true
WHATSAPP_PROCESS_DOCUMENTS=true
WHATSAPP_PROCESS_AUDIO=true
```

## Step 5: Verify Configuration

### 5.1 Test Webhook Connection

```bash
# Send a test message from Meta's API Test Console
curl -X POST "https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "YOUR_TEST_PHONE_NUMBER",
    "type": "text",
    "text": {
      "body": "Hello! This is a test message from your e-commerce platform."
    }
  }'
```

### 5.2 Check Backend Logs

```bash
# Watch backend logs for webhook events
docker-compose logs -f backend

# You should see:
# [WhatsAppService] Webhook verified successfully
# [WhatsAppService] Received message from +221XXXXXXXXX
```

### 5.3 Test Supplier Submission

1. Send a WhatsApp message to your business number:
   ```
   Product: Gaming Laptop
   Brand: ASUS ROG
   Price: 1,500,000 FCFA
   Condition: New
   Quantity: 5
   ```

2. Check admin dashboard:
   - Go to `/admin/whatsapp`
   - Verify submission appears in the list
   - Check processing status

## Environment Variables Reference

### Required Variables

| Variable | Description | Example | Where to Find |
|----------|-------------|---------|---------------|
| `WHATSAPP_ACCESS_TOKEN` | Permanent access token | `EAABsbCS...` | Meta App → WhatsApp → API Setup |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone number ID | `123456789012345` | Meta App → WhatsApp → API Setup |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verification token | `my_secure_token` | You create this (random string) |
| `WHATSAPP_APP_ID` | Meta App ID | `1234567890` | Meta App → Settings → Basic |
| `WHATSAPP_APP_SECRET` | Meta App Secret | `abc123...` | Meta App → Settings → Basic |

### Optional Variables

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `WHATSAPP_API_VERSION` | API version | `v18.0` | Use latest stable version |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Business account ID | - | For analytics and reporting |
| `WHATSAPP_WEBHOOK_SECRET` | Webhook signature secret | - | For enhanced security |
| `WHATSAPP_RATE_LIMIT` | Messages per second | `80` | Cloud API limit |
| `WHATSAPP_ENABLED` | Enable/disable feature | `true` | Feature flag |
| `WHATSAPP_AUTO_APPROVE_ENABLED` | Auto-approve trusted suppliers | `true` | Requires confidence threshold |
| `WHATSAPP_AUTO_APPROVE_THRESHOLD` | Confidence threshold | `0.9` | 0.0 to 1.0 |

## Step 6: Production Deployment

### 6.1 Security Checklist

- ✅ Use permanent access token (not temporary)
- ✅ Store credentials in secure environment variables
- ✅ Enable webhook signature verification
- ✅ Use HTTPS for all endpoints
- ✅ Implement rate limiting
- ✅ Set up monitoring and alerts
- ✅ Configure proper CORS settings
- ✅ Enable audit logging

### 6.2 Webhook Signature Verification

Enable signature verification for production:

```typescript
// In whatsapp.controller.ts
@Post('webhook')
async handleWebhook(
  @Body() body: any,
  @Headers('x-hub-signature-256') signature: string,
) {
  // Verify signature
  const isValid = this.whatsappService.verifyWebhookSignature(
    JSON.stringify(body),
    signature,
  );
  
  if (!isValid) {
    throw new UnauthorizedException('Invalid webhook signature');
  }
  
  // Process webhook...
}
```

### 6.3 Rate Limiting

The Cloud API has these limits:
- **80 messages per second** per phone number
- **1,000 messages per day** (can be increased)
- **10,000 messages per month** (can be increased)

Request limit increases:
1. Go to WhatsApp → **API Setup**
2. Click **"Request Higher Limits"**
3. Provide business justification
4. Wait for approval (usually 24-48 hours)

### 6.4 Monitoring

Set up monitoring for:
- Webhook delivery failures
- Message processing errors
- API rate limit warnings
- Supplier submission trends
- Auto-approval rates

## Step 7: Testing

### 7.1 Test Scenarios

1. **Text Message Submission**
   ```
   Product: Gaming Mouse
   Brand: Logitech
   Price: 45000
   ```

2. **Image Submission**
   - Send product image with caption
   - System should extract product details from image

3. **PDF Submission**
   - Send product catalog PDF
   - System should extract multiple products

4. **Voice Message**
   - Send voice description
   - System should transcribe and extract data

### 7.2 Verify Processing Pipeline

Check each stage:
1. ✅ Webhook receives message
2. ✅ Message stored in database
3. ✅ AI processing extracts data
4. ✅ Validation queue shows submission
5. ✅ Admin can approve/reject
6. ✅ Approved items added to inventory

## Troubleshooting

### Common Issues

#### 1. Webhook Not Receiving Messages

**Problem**: Messages sent but webhook not triggered

**Solutions**:
- Verify webhook URL is publicly accessible
- Check webhook subscriptions are active
- Ensure HTTPS is used (not HTTP)
- Verify verify token matches
- Check firewall/security group settings

#### 2. "Invalid Access Token" Error

**Problem**: API calls return 401 Unauthorized

**Solutions**:
- Regenerate permanent access token
- Check token hasn't expired
- Verify token has correct permissions
- Ensure token is for the correct app

#### 3. Media Download Fails

**Problem**: Images/PDFs not downloading

**Solutions**:
- Check media URL is still valid (expires after 5 minutes)
- Verify access token has media permissions
- Ensure sufficient disk space
- Check file size limits

#### 4. Rate Limit Exceeded

**Problem**: "Rate limit exceeded" errors

**Solutions**:
- Implement exponential backoff
- Request higher limits from Meta
- Queue messages for batch processing
- Monitor rate limit headers

### Debug Mode

Enable debug logging:

```env
# In .env
LOG_LEVEL=debug
WHATSAPP_DEBUG=true
```

View detailed logs:
```bash
docker-compose logs -f backend | grep WhatsApp
```

## API Endpoints

### Webhook Endpoints

```
GET  /whatsapp/webhook          # Webhook verification
POST /whatsapp/webhook          # Receive messages
```

### Admin Endpoints

```
GET  /admin/whatsapp/pipeline/stats              # Pipeline statistics
GET  /admin/whatsapp/submissions                 # List submissions
GET  /admin/whatsapp/submissions/:id             # Get submission details
POST /admin/whatsapp/submissions/:id/process     # Manually process
POST /admin/whatsapp/submissions/:id/reprocess   # Reprocess failed
GET  /admin/whatsapp/health                      # System health
GET  /admin/whatsapp/health/errors               # Error list
```

## Cost Estimation

### WhatsApp Business API Pricing

**Cloud API (Recommended)**:
- First 1,000 conversations/month: **FREE**
- After that: Varies by country
  - Senegal: ~$0.05 per conversation
  - Ivory Coast: ~$0.05 per conversation
  - Mali: ~$0.05 per conversation

**Conversation Definition**:
- 24-hour window from first message
- Multiple messages in 24h = 1 conversation

**Example Monthly Cost**:
- 100 suppliers × 10 submissions/month = 1,000 conversations
- First 1,000: **FREE**
- Additional 1,000: ~$50/month

## Best Practices

### 1. Message Templates

Create message templates for:
- Welcome messages to new suppliers
- Submission confirmations
- Approval notifications
- Rejection notifications with feedback

### 2. Supplier Onboarding

1. Send welcome message with instructions
2. Provide example submission format
3. Share template for product details
4. Explain approval process

### 3. Error Handling

- Implement retry logic with exponential backoff
- Store failed messages for manual review
- Send error notifications to suppliers
- Log all errors for debugging

### 4. Data Validation

- Validate phone numbers before processing
- Check message format before AI processing
- Verify media files are valid
- Sanitize all input data

### 5. Performance Optimization

- Use message queues for processing
- Implement caching for frequent queries
- Batch database operations
- Optimize media storage

## Support Resources

- **Meta for Developers**: [developers.facebook.com](https://developers.facebook.com)
- **WhatsApp Business API Docs**: [developers.facebook.com/docs/whatsapp](https://developers.facebook.com/docs/whatsapp)
- **Cloud API Reference**: [developers.facebook.com/docs/whatsapp/cloud-api](https://developers.facebook.com/docs/whatsapp/cloud-api)
- **Business Manager**: [business.facebook.com](https://business.facebook.com)
- **Support**: [business.facebook.com/business/help](https://business.facebook.com/business/help)

## Next Steps

1. ✅ Complete Meta App setup
2. ✅ Configure environment variables
3. ✅ Test webhook connection
4. ✅ Send test messages
5. ✅ Verify admin dashboard
6. ✅ Train suppliers on submission format
7. ✅ Monitor system performance
8. ✅ Request higher rate limits if needed

## Security Notes

⚠️ **Never commit credentials to version control**
⚠️ **Rotate access tokens regularly**
⚠️ **Use webhook signature verification in production**
⚠️ **Implement rate limiting on your endpoints**
⚠️ **Monitor for suspicious activity**
⚠️ **Keep dependencies updated**
⚠️ **Use HTTPS everywhere**
⚠️ **Sanitize all user input**

---

For additional help, refer to:
- [PIPELINE_INTEGRATION.md](backend/src/whatsapp/PIPELINE_INTEGRATION.md)
- [WHATSAPP_ADMIN_ENDPOINTS.md](backend/src/admin/WHATSAPP_ADMIN_ENDPOINTS.md)
- [WHATSAPP_ADMIN_FRONTEND.md](frontend/WHATSAPP_ADMIN_FRONTEND.md)
