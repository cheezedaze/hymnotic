import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
    });
  }
  return _stripe;
}

export function getStripeConfig() {
  return {
    monthlyPriceId: process.env.STRIPE_MONTHLY_PRICE_ID ?? "",
    yearlyPriceId: process.env.STRIPE_YEARLY_PRICE_ID ?? "",
    introCouponId: process.env.STRIPE_INTRO_COUPON_ID ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  };
}
