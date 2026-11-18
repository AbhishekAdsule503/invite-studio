import prisma from '../../database/prisma.js';
import razorpayProvider from './razorpayProvider.js';

export class PaymentService {
  constructor(provider = razorpayProvider) {
    this.provider = provider;
  }

  /**
   * Creates a payment order for a yearly or monthly plan
   */
  async createSubscriptionOrder(userId, planId, billingCycle = 'YEARLY') {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });

    if (!plan || !plan.isActive || plan.isLegacy) {
      const err = new Error('Requested subscription plan does not exist or is inactive.');
      err.statusCode = 404;
      throw err;
    }

    if (plan.code === 'TRIAL' || (plan.priceYearly <= 0 && (!plan.priceMonthly || plan.priceMonthly <= 0))) {
      const err = new Error('Free or trial plans do not require payment processing.');
      err.statusCode = 400;
      throw err;
    }

    const cycle = billingCycle?.toUpperCase() === 'MONTHLY' ? 'MONTHLY' : 'YEARLY';

    if (cycle === 'MONTHLY' && !plan.hasMonthlyBilling) {
      const err = new Error(`Monthly billing is not available for ${plan.name}.`);
      err.statusCode = 400;
      throw err;
    }

    if (cycle === 'YEARLY' && !plan.hasYearlyBilling) {
      const err = new Error(`Yearly billing is not available for ${plan.name}.`);
      err.statusCode = 400;
      throw err;
    }

    const amount = cycle === 'MONTHLY' ? plan.priceMonthly : plan.priceYearly;

    if (amount <= 0) {
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
      amount,
      currency: plan.currency || 'INR',
      receipt,
      notes: {
        userId,
        planId: plan.id,
        planCode: plan.code,
        billingCycle: cycle,
        userMobile: user.mobile
      }
    });

    // Store pending transaction record
    const transaction = await prisma.paymentTransaction.create({
      data: {
        userId,
        planId: plan.id,
        amount,
        currency: plan.currency || 'INR',
        orderId: orderData.orderId,
        status: 'PENDING',
        paymentProvider: 'RAZORPAY',
        billingCycle: cycle,
        metadata: JSON.stringify({
          planName: plan.name,
          planCode: plan.code,
          billingCycle: cycle,
          isSandbox: orderData.isSandbox || false,
          receipt
        })
      }
    });

    return {
      orderId: orderData.orderId,
      amount,
      currency: plan.currency || 'INR',
      keyId: orderData.keyId,
      transactionId: transaction.id,
      billingCycle: cycle,
      plan: {
        id: plan.id,
        name: plan.name,
        code: plan.code,
        priceYearly: plan.priceYearly,
        priceMonthly: plan.priceMonthly,
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

    // Activate subscription based on billingCycle
    const cycle = transaction.billingCycle || 'YEARLY';
    const durationDays = cycle === 'MONTHLY' ? 30 : 365;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const subscription = await prisma.userSubscription.upsert({
      where: { userId },
      create: {
        userId,
        planId: transaction.planId,
        status: 'ACTIVE',
        billingCycle: cycle,
        startsAt: now,
        expiresAt,
        paymentProvider: 'RAZORPAY',
        paymentId
      },
      update: {
        planId: transaction.planId,
        status: 'ACTIVE',
        billingCycle: cycle,
        startsAt: now,
        expiresAt,
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
        expiresAt,
        reason: 'RAZORPAY_PAYMENT',
        notes: `Verified ${cycle.toLowerCase()} payment for ${transaction.plan.name} (₹${(transaction.amount / 100).toFixed(2)})`,
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

          const cycle = transaction.billingCycle || 'YEARLY';
          const durationDays = cycle === 'MONTHLY' ? 30 : 365;
          const now = new Date();
          const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

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
              billingCycle: cycle,
              startsAt: now,
              expiresAt,
              paymentProvider: 'RAZORPAY',
              paymentId
            },
            update: {
              planId: transaction.planId,
              status: 'ACTIVE',
              billingCycle: cycle,
              startsAt: now,
              expiresAt,
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
              expiresAt,
              reason: 'WEBHOOK_PAYMENT_CAPTURED',
              notes: `Webhook confirmed ${cycle.toLowerCase()} payment for order ${orderId}`,
              performedBy: 'SYSTEM'
            }
          });
        }
      }
    } else if (eventType === 'payment.failed') {
      const entity = payload.payload?.payment?.entity;
      const orderId = entity?.order_id;
      const paymentId = entity?.id;
      const errorDescription = entity?.error_description || entity?.error_reason || 'Payment failed';

      if (orderId) {
        const transaction = await prisma.paymentTransaction.findUnique({
          where: { orderId }
        });

        // Only mark FAILED if currently PENDING - do not overwrite SUCCESS
        if (transaction && transaction.status === 'PENDING') {
          let metadata = {};
          try {
            metadata = JSON.parse(transaction.metadata || '{}');
          } catch {
            metadata = {};
          }

          await prisma.paymentTransaction.update({
            where: { id: transaction.id },
            data: {
              status: 'FAILED',
              paymentId: paymentId || transaction.paymentId,
              webhookEventId: eventId,
              metadata: JSON.stringify({
                ...metadata,
                failureReason: errorDescription,
                failedAt: new Date().toISOString()
              })
            }
          });
        }
      }
    }

    return { received: true, event: eventType };
  }

  /**
   * Records a user-initiated payment failure or modal dismissal safely
   */
  async recordPaymentFailure(userId, { orderId, paymentId, reason, description }) {
    if (!orderId) {
      const err = new Error('Order ID is required to record payment failure.');
      err.statusCode = 400;
      throw err;
    }

    const transaction = await prisma.paymentTransaction.findUnique({
      where: { orderId }
    });

    if (!transaction) {
      const err = new Error('Payment order record not found.');
      err.statusCode = 404;
      throw err;
    }

    if (transaction.userId !== userId) {
      const err = new Error('Unauthorized transaction ownership verification.');
      err.statusCode = 403;
      throw err;
    }

    // If transaction is already SUCCESS, idempotently retain SUCCESS
    if (transaction.status === 'SUCCESS') {
      return { success: true, status: 'SUCCESS', message: 'Transaction already succeeded.' };
    }

    let meta = {};
    try {
      meta = JSON.parse(transaction.metadata || '{}');
    } catch {
      meta = {};
    }

    const updated = await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'FAILED',
        paymentId: paymentId || transaction.paymentId,
        metadata: JSON.stringify({
          ...meta,
          failureReason: description || reason || 'Payment cancelled or failed in checkout',
          failedAt: new Date().toISOString()
        })
      }
    });

    return {
      success: true,
      status: 'FAILED',
      transaction: updated
    };
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
