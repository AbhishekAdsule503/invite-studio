import crypto from 'crypto';
import Razorpay from 'razorpay';
import PaymentProvider from './paymentProvider.js';
import { config } from '../../config/env.js';

export class RazorpayProvider extends PaymentProvider {
  constructor(options = {}) {
    super();
    this.keyId = options.keyId || config.razorpay?.keyId || process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = options.keySecret || config.razorpay?.keySecret || process.env.RAZORPAY_KEY_SECRET || '';
    this.webhookSecret = options.webhookSecret || config.razorpay?.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || '';
    this._refreshState();
  }

  /**
   * Refreshes internal state and Razorpay SDK client from latest environment variables
   */
  _refreshState() {
    this.keyId = this.keyId || config.razorpay?.keyId || process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = this.keySecret || config.razorpay?.keySecret || process.env.RAZORPAY_KEY_SECRET || '';
    this.webhookSecret = this.webhookSecret || config.razorpay?.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || '';

    this.isTestMode = Boolean(this.keyId && this.keyId.startsWith('rzp_test_'));
    this.isLive = Boolean(this.keyId && this.keyId.startsWith('rzp_live_'));
    this.isConfigured = Boolean(this.keyId && this.keySecret && !this.keyId.startsWith('rzp_test_mock'));

    if (this.isConfigured) {
      try {
        this.client = new Razorpay({
          key_id: this.keyId,
          key_secret: this.keySecret
        });
      } catch (err) {
        console.error('[RazorpayProvider] Razorpay SDK initialization warning:', err.message);
        this.client = null;
      }
    } else {
      this.client = null;
    }
  }

  /**
   * Helper to check credentials status for UI & health checks
   */
  getStatus() {
    this._refreshState();
    return {
      provider: 'RAZORPAY',
      configured: this.isConfigured,
      mode: this.isLive ? 'live' : (this.isTestMode ? 'test' : (this.isConfigured ? 'test_credentials' : 'sandbox_ready')),
      keyId: this.keyId || null,
      notes: this.isConfigured
        ? `Razorpay ${this.isLive ? 'Live' : 'Test Mode'} credentials configured`
        : 'Razorpay credentials not set. Operating in secure sandbox-ready mode. Real transactions require RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET.'
    };
  }

  /**
   * Creates an order with Razorpay Test Mode or sandbox fallback
   */
  async createOrder({ amount, currency = 'INR', receipt, notes = {} }) {
    if (!amount || amount <= 0) {
      const err = new Error('Order amount must be a positive integer in minor units (paise).');
      err.statusCode = 400;
      throw err;
    }

    this._refreshState();

    // If real/test credentials are provided, invoke Razorpay Orders API
    if (this.isConfigured && !this.keyId.startsWith('rzp_test_mock')) {
      try {
        if (this.client) {
          const order = await this.client.orders.create({
            amount,
            currency,
            receipt: receipt || `rcpt_${Date.now()}`,
            notes
          });

          return {
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: this.keyId,
            isSandbox: false
          };
        }

        // Native HTTP fallback
        const authHeader = 'Basic ' + Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader
          },
          body: JSON.stringify({
            amount,
            currency,
            receipt: receipt || `rcpt_${Date.now()}`,
            notes
          })
        });

        if (!response.ok) {
          const errBody = await response.json();
          const err = new Error(errBody.error?.description || 'Failed to create Razorpay order');
          err.statusCode = response.status;
          throw err;
        }

        const order = await response.json();
        return {
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          keyId: this.keyId,
          isSandbox: false
        };
      } catch (err) {
        if (err.statusCode) throw err;
        console.error('[RazorpayProvider] API connection error:', err.message);
        throw new Error(`Razorpay API error: ${err.message}`);
      }
    }

    // Sandbox-ready mode: Standardized simulated order for local development/testing
    const orderId = `order_sbx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    return {
      orderId,
      amount,
      currency,
      keyId: this.keyId || 'rzp_test_mock_invite_studio',
      isSandbox: true,
      notes: {
        ...notes,
        sandboxNotice: 'Running in sandbox-ready mode with simulated gateway'
      }
    };
  }

  /**
   * Verifies cryptographic HMAC-SHA256 signature for payment verification
   */
  async verifyPaymentSignature({ orderId, paymentId, signature }) {
    if (!orderId || !paymentId || !signature) {
      return false;
    }

    this._refreshState();
    const secret = this.keySecret || 'sandbox_razorpay_secret_test_key';
    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Secure constant-time comparison to prevent timing attacks
    try {
      const sigBuf = Buffer.from(signature, 'utf8');
      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      if (sigBuf.length !== expectedBuf.length) {
        return false;
      }
      return crypto.timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  }

  /**
   * Generates a valid test signature for sandbox testing
   */
  generateSandboxSignature(orderId, paymentId) {
    this._refreshState();
    const secret = this.keySecret || 'sandbox_razorpay_secret_test_key';
    const payload = `${orderId}|${paymentId}`;
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Verifies incoming webhook HMAC-SHA256 signature using SDK & crypto fallback
   */
  async verifyWebhookSignature({ rawBody, signature }) {
    if (!signature || !rawBody) {
      return false;
    }

    this._refreshState();
    const secret = this.webhookSecret || this.keySecret || 'sandbox_razorpay_secret_test_key';

    // 1. Official Razorpay SDK webhook validator
    try {
      const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
      const isValid = Razorpay.validateWebhookSignature(bodyStr, signature, secret);
      if (isValid) return true;
    } catch {
      // Continue to cryptographic HMAC comparison
    }

    // 2. Cryptographic timing-safe comparison
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    try {
      const sigBuf = Buffer.from(signature, 'utf8');
      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      if (sigBuf.length !== expectedBuf.length) {
        return false;
      }
      return crypto.timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  }
}

export const razorpayProvider = new RazorpayProvider();
export default razorpayProvider;
