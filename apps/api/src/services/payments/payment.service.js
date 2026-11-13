import prisma from '../../database/prisma.js';
import razorpayProvider from './razorpayProvider.js';

export class PaymentService {
  constructor(provider = razorpayProvider) {
    this.provider = provider;
  }

  /**
   * Creates a payment order for a yearly plan
   */
  async createSubscriptionOrder(userId, planId) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });

    if (!plan || !plan.isActive) {
      const err = new Error('Requested subscription plan does not exist or is inactive.');
      err.statusCode = 404;
      throw err;
    }

    if (plan.priceYearly <= 0) {
      const err = new Error('Free or trial plans do not require payment processing.');
      err.statusCode = 400;
      throw err;
    }

    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.isActive) {
      const err = new Error('User account is invalid or deactivated.');
      err.statusCode = 403;
      throw err;
    }

    // Create order via provider abstraction
    const receipt = `rcpt_${userId.slice(0, 8)}_${Date.now()}`;
    const orderData = await this.provider.createOrder({
      amount: plan.priceYearly,
      currency: plan.currency || 'INR',
      receipt,
      notes: {
        userId,
        planId: plan.id,
        planCode: plan.code,
        userMobile: user.mobile
      }
    });

    // Store pending transaction record
    const transaction = await prisma.paymentTransaction.create({
      data: {
        userId,
        planId: plan.id,
        amount: plan.priceYearly,
        currency: plan.currency || 'INR',
        orderId: orderData.orderId,
        status: 'PENDING',
        paymentProvider: 'RAZORPAY',
        metadata: JSON.stringify({
          planName: plan.name,
          planCode: plan.code,
          isSandbox: orderData.isSandbox || false,
          receipt
        })
      }
    });

    return {
      orderId: orderData.orderId,
      amount: plan.priceYearly,
      currency: plan.currency || 'INR',
      keyId: orderData.keyId,
      transactionId: transaction.id,
      plan: {
        id: plan.id,
        name: plan.name,
        code: plan.code,
        priceYearly: plan.priceYearly,
        currency: plan.currency
      },
      isSandbox: Boolean(orderData.isSandbox)
    };
  }

  /**
   * Verifies client payment signature and activates subscription idempotently
   */
  async verifyAndActivateSubscription({ userId, orderId, paymentId, signature }) {
    if (!orderId || !paymentId || !signature) {
      const err = new Error('Missing required payment verification parameters (orderId, paymentId, signature).');
      err.statusCode = 400;
      throw err;
    }

    // Retrieve pending or existing transaction
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { orderId },
      include: { plan: true, user: true }
    });

    if (!transaction) {
      const err = new Error('Payment order record not found. Please initiate checkout again.');
      err.statusCode = 404;
      throw err;
    }

    if (transaction.userId !== userId) {
      const err = new Error('Unauthorized transaction ownership verification.');
      err.statusCode = 403;
      throw err;
    }

    // Idempotency check: If already SUCCESS, return existing activation
    if (transaction.status === 'SUCCESS') {
      const existingSub = await prisma.userSubscription.findUnique({
        where: { userId },
        include: { plan: true }
      });
      return {
        success: true,
        alreadyProcessed: true,
        transaction,
        subscription: existingSub
      };
    }

    // Cryptographic signature verification
    const isValidSignature = await this.provider.verifyPaymentSignature({
      orderId,
      paymentId,
      signature
    });

    if (!isValidSignature) {
      // Mark transaction failed
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          paymentId,
          signature,
          metadata: JSON.stringify({
            ...JSON.parse(transaction.metadata || '{}'),
            failureReason: 'Invalid cryptographic payment signature'
          })
        }
      });

      const err = new Error('Payment verification failed: Invalid payment signature.');
      err.statusCode = 400;
      throw err;
    }

    // Update transaction to SUCCESS
    const updatedTransaction = await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'SUCCESS',
        paymentId,
        signature
      }
    });

    // Activate subscription (1-year duration)
    const now = new Date();
    const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    const subscription = await prisma.userSubscription.upsert({
      where: { userId },
      create: {
        userId,
        planId: transaction.planId,
        status: 'ACTIVE',
        startsAt: now,
        expiresAt: oneYearLater,
        paymentProvider: 'RAZORPAY',
        paymentId
      },
      update: {
        planId: transaction.planId,
        status: 'ACTIVE',
        startsAt: now,
        expiresAt: oneYearLater,
        cancelledAt: null,
        paymentProvider: 'RAZORPAY',
        paymentId
      },
      include: { plan: true }
    });

    // Maintain subscription history
    await prisma.subscriptionHistory.create({
      data: {
        userId,
        planId: transaction.planId,
        status: 'ACTIVE',
        startsAt: now,
        expiresAt: oneYearLater,
        reason: 'RAZORPAY_PAYMENT',
        notes: `Verified payment for ${transaction.plan.name} (₹${(transaction.amount / 100).toFixed(2)})`,
        performedBy: 'USER'
      }
    });

    // Record in AuditLog
    await prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'PAYMENT_VERIFIED_SUBSCRIPTION_ACTIVATED',
        resourceType: 'UserSubscription',
        resourceId: subscription.id,
        metadata: JSON.stringify({
          orderId,
          paymentId,
          planCode: transaction.plan.code,
          amount: transaction.amount
        })
      }
    });

    return {
      success: true,
      alreadyProcessed: false,
      transaction: updatedTransaction,
      subscription
    };
  }

  /**
   * Idempotent webhook handler for Razorpay asynchronous event notifications
   */
  async processWebhook(rawBody, signature) {
    const isValid = await this.provider.verifyWebhookSignature({
      rawBody,
      signature
    });

    if (!isValid) {
      const err = new Error('Invalid webhook signature.');
      err.statusCode = 400;
      throw err;
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    const eventId = payload.event_id || payload.id;
    const eventType = payload.event;

    // Idempotency: Check if webhook event was already processed
    if (eventId) {
      const existing = await prisma.paymentTransaction.findUnique({
        where: { webhookEventId: eventId }
      });
      if (existing) {
        return { received: true, alreadyProcessed: true };
      }
    }

    if (eventType === 'order.paid' || eventType === 'payment.captured') {
      const entity = payload.payload?.payment?.entity || payload.payload?.order?.entity;
      const orderId = entity?.order_id || entity?.id;
      const paymentId = entity?.id;

      if (orderId) {
        const transaction = await prisma.paymentTransaction.findUnique({
          where: { orderId },
          include: { plan: true }
        });

        if (transaction) {
          if (transaction.status === 'SUCCESS') {
            // Already verified via client or previous webhook; store webhookEventId for deduplication
            if (eventId && !transaction.webhookEventId) {
              await prisma.paymentTransaction.update({
                where: { id: transaction.id },
                data: { webhookEventId: eventId }
              });
            }
            return { received: true, alreadyProcessed: true };
          }

          const now = new Date();
          const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

          await prisma.paymentTransaction.update({
            where: { id: transaction.id },
            data: {
              status: 'SUCCESS',
              paymentId: paymentId || transaction.paymentId,
              webhookEventId: eventId
            }
          });

          await prisma.userSubscription.upsert({
            where: { userId: transaction.userId },
            create: {
              userId: transaction.userId,
              planId: transaction.planId,
              status: 'ACTIVE',
              startsAt: now,
              expiresAt: oneYearLater,
              paymentProvider: 'RAZORPAY',
              paymentId
            },
            update: {
              planId: transaction.planId,
              status: 'ACTIVE',
              startsAt: now,
              expiresAt: oneYearLater,
              cancelledAt: null,
              paymentProvider: 'RAZORPAY',
              paymentId
            }
          });

          await prisma.subscriptionHistory.create({
            data: {
              userId: transaction.userId,
              planId: transaction.planId,
              status: 'ACTIVE',
              startsAt: now,
              expiresAt: oneYearLater,
              reason: 'WEBHOOK_PAYMENT_CAPTURED',
              notes: `Webhook confirmed payment for order ${orderId}`,
              performedBy: 'SYSTEM'
            }
          });
        }
      }
    }

    return { received: true, event: eventType };
  }

  /**
   * Retrieves verified payment transactions for a specific user
   */
  async getUserPaymentHistory(userId) {
    return prisma.paymentTransaction.findMany({
      where: { userId },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            code: true,
            priceYearly: true,
            currency: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Retrieves all verified payment transactions for admin review
   */
  async getAllPaymentsAdmin({ page = 1, limit = 20, status } = {}) {
    const skip = (Math.max(1, page) - 1) * limit;
    const where = status ? { status } : {};

    const [total, payments] = await Promise.all([
      prisma.paymentTransaction.count({ where }),
      prisma.paymentTransaction.findMany({
        where,
        skip,
        take: limit,
        include: {
          plan: {
            select: {
              id: true,
              name: true,
              code: true,
              priceYearly: true,
              currency: true
            }
          },
          user: {
            select: {
              id: true,
              mobile: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      payments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}

export const paymentService = new PaymentService();
export default paymentService;
