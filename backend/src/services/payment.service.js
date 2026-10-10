/**
 * Payment service — demo/COD recording, plus the gateway hook.
 *
 * No payment gateway is configured in this build. The service therefore:
 *   - records `demo` payments as PAID with an explicit "simulated" note, and
 *   - records cash-on-delivery as PENDING (money is collected on delivery);
 *   - refuses to invent a gateway result: `verifyGatewayPayment()` throws until
 *     a supported provider is integrated and its signature verified HERE, on
 *     the server. A frontend can never mark a real payment successful.
 */
'use strict';

const crypto = require('crypto');
const { env } = require('../config/env');
const { ApiError } = require('../utils/ApiError');
const { constants } = require('./shared');

const METHODS = constants.PAYMENT_METHODS;
const STATUS = constants.PAYMENT_STATUS;

function describe(method) {
  switch (method) {
    case METHODS.COD:
      return {
        paymentStatus: STATUS.PENDING,
        paymentNote: 'Cash on delivery — pay the delivery partner. No online charge was made.',
        verified: false,
      };
    case METHODS.DEMO:
      return {
        paymentStatus: STATUS.PAID,
        paymentNote: 'Simulated payment for this demo build. No payment gateway was contacted and no money moved.',
        verified: false,
        simulated: true,
      };
    case METHODS.UPI:
    case METHODS.CARD:
      return {
        paymentStatus: STATUS.PENDING,
        paymentNote: 'Online payment requires a gateway integration with server-side verification, which is not configured in this build.',
        verified: false,
        requiresGateway: true,
      };
    default:
      throw ApiError.badRequest('Choose a payment method.', { code: 'UNKNOWN_PAYMENT_METHOD' });
  }
}

/** Reject online methods until a gateway is configured and verified here. */
function assertMethodAllowed(method) {
  const allowed = [];
  if (env.payments.mode === 'demo' || true) allowed.push(METHODS.DEMO);
  allowed.push(METHODS.COD);
  if (env.payments.gatewayConfigured) allowed.push(METHODS.UPI, METHODS.CARD);
  if (!allowed.includes(method)) {
    throw ApiError.unprocessable(
      method === METHODS.UPI || method === METHODS.CARD
        ? 'Online payments are not enabled: no payment gateway with server-side verification is configured.'
        : 'That payment method is not supported.',
      { code: 'PAYMENT_METHOD_UNAVAILABLE', method }
    );
  }
  return true;
}

/**
 * Verify a gateway payment server-side.
 *
 * This is the ONLY place a real payment may be marked PAID. It is deliberately
 * unimplemented: wiring it up requires the provider's SDK/webhook secret and a
 * signature check. Until then it fails loudly rather than pretending.
 */
async function verifyGatewayPayment(payload) {
  if (!env.payments.gatewayConfigured) {
    throw ApiError.unprocessable(
      'No payment gateway is configured (PAYMENT_MODE=demo). Online payments cannot be verified, so they are not offered.',
      { code: 'GATEWAY_NOT_CONFIGURED' }
    );
  }
  // Integration point — implement before enabling UPI/card:
  //   1. verify the webhook/callback signature with the provider secret;
  //   2. re-fetch the payment from the provider API by its id;
  //   3. compare the provider amount against order.totals.grandTotal;
  //   4. only then return { verified: true, ref }.
  throw ApiError.unprocessable('Gateway verification is not implemented in this build.', { code: 'GATEWAY_NOT_IMPLEMENTED', payloadKeys: Object.keys(payload || {}) });
}

/** Deterministic local reference for demo/COD records (not a gateway id). */
function localReference(orderNumber, method) {
  const hash = crypto.createHash('sha1').update([orderNumber, method, Date.now()].join('|')).digest('hex').slice(0, 12).toUpperCase();
  return 'DEMO-' + hash;
}

async function authorise(order, method) {
  assertMethodAllowed(method);
  if (method === METHODS.UPI || method === METHODS.CARD) {
    const verified = await verifyGatewayPayment({ orderNumber: order.orderNumber, amount: order.totals.grandTotal });
    return { paymentStatus: STATUS.PAID, paymentNote: 'Payment verified by the gateway.', paymentRef: verified.ref, paymentVerified: true };
  }
  const described = describe(method);
  return Object.assign({}, described, { paymentRef: localReference(order.orderNumber, method) });
}

module.exports = { describe, assertMethodAllowed, verifyGatewayPayment, localReference, authorise, METHODS, STATUS };
