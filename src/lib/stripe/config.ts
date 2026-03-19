import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export const STRIPE_CONFIG = {
  monthlyPriceId: process.env.STRIPE_MONTHLY_PRICE_ID!,
  yearlyPriceId: process.env.STRIPE_YEARLY_PRICE_ID!,
  introPriceId: process.env.STRIPE_INTRO_PRICE_ID, // optional $1.99 first month
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
};
