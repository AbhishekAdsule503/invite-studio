import subscriptionService from '../../services/subscription.service.js';
import paymentService from '../../services/payments/payment.service.js';
import razorpayProvider from '../../services/payments/razorpayProvider.js';

export async function getCurrentSubscription(req, res, next) {
  try {
    const data = await subscriptionService.getCurrentSubscription(req.user.id);
    return res.status(200).json({
      success: true,
      ...data
    });
  } catch (error) {
    next(error);
  }
}

export async function getPlans(_req, res, next) {
  try {
    const plans = await subscriptionService.getAvailablePlans();
    const gatewayStatus = razorpayProvider.getStatus();
    return res.status(200).json({
      success: true,
      plans,
      gateway: {
        configured: gatewayStatus.configured,
        mode: gatewayStatus.mode,
        keyId: gatewayStatus.keyId
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getSubscriptionHistory(req, res, next) {
  try {
    const history = await subscriptionService.getUserHistory(req.user.id);
    return res.status(200).json({
      success: true,
      ...history
    });
  } catch (error) {
    next(error);
  }
}

export async function createOrder(req, res, next) {
  try {
    const { planId, billingCycle } = req.body;
    const order = await paymentService.createSubscriptionOrder(req.user.id, planId, billingCycle);
    return res.status(200).json({
      success: true,
      ...order
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyPayment(req, res, next) {
  try {
    const { orderId, paymentId, signature } = req.body;
    const result = await paymentService.verifyAndActivateSubscription({
      userId: req.user.id,
      orderId,
      paymentId,
      signature
    });

    return res.status(200).json({
      success: true,
      message: 'Payment verified and subscription activated successfully.',
      ...result
    });
  } catch (error) {
    next(error);
  }
}

export async function handleWebhook(req, res, next) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));

    const result = await paymentService.processWebhook(rawBody, signature);
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
}

export async function recordPaymentFailure(req, res, next) {
  try {
    const { orderId, paymentId, reason, description } = req.body;
    const result = await paymentService.recordPaymentFailure(req.user.id, {
      orderId,
      paymentId,
      reason,
      description
    });
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelSubscription(req, res, next) {
  try {
    const result = await subscriptionService.cancelSubscription(req.user.id);
    return res.status(200).json({
      success: true,
      message: 'Subscription has been cancelled. Your access will remain active until the current expiration date.',
      subscription: result
    });
  } catch (error) {
    next(error);
  }
}
