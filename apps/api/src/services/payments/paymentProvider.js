/**
 * Payment Provider Abstract Base Class
 */
export class PaymentProvider {
  /**
   * Creates an order with the payment gateway
   * @param {Object} params
   * @param {number} params.amount - Amount in minor units (paise)
   * @param {string} params.currency - e.g. 'INR'
   * @param {string} params.receipt - Unique order/receipt identifier
   * @param {Object} [params.notes] - Key-value metadata
   * @returns {Promise<{ orderId: string, amount: number, currency: string, [key: string]: any }>}
   */
  async createOrder(_params) {
    throw new Error('createOrder must be implemented by payment provider');
  }

  /**
   * Verifies payment signature returned by client
   * @param {Object} params
   * @param {string} params.orderId
   * @param {string} params.paymentId
   * @param {string} params.signature
   * @returns {Promise<boolean>}
   */
  async verifyPaymentSignature(_params) {
    throw new Error('verifyPaymentSignature must be implemented by payment provider');
  }

  /**
   * Verifies webhook payload signature
   * @param {Object} params
   * @param {string|Buffer} params.rawBody
   * @param {string} params.signature
   * @param {string} [params.secret]
   * @returns {Promise<boolean>}
   */
  async verifyWebhookSignature(_params) {
    throw new Error('verifyWebhookSignature must be implemented by payment provider');
  }
}

export default PaymentProvider;
