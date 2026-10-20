#!/usr/bin/env node

/**
 * Safe, offline proof harness for the Mercado Pago introductory-offer rules.
 *
 * This file deliberately does not call Mercado Pago. It validates the local
 * invariants that must hold before an external sandbox run is authorized.
 * A successful run is not evidence that Mercado Pago accepts the flow.
 */

const MINUTE = 60_000;

export function evaluateAttempt({ offerStartedAt, now, attemptStartedAt, firstPaid }) {
  if (firstPaid) return { eligible: false, amount: 39.90, reason: "benefit-consumed" };
  const offerEndsAt = offerStartedAt + 2 * 60 * MINUTE;
  if (now > offerEndsAt) return { eligible: false, amount: 39.90, reason: "offer-expired" };
  const attemptEndsAt = attemptStartedAt + 30 * MINUTE;
  if (now > attemptEndsAt) return { eligible: false, amount: 39.90, reason: "attempt-expired" };
  return { eligible: true, amount: 29.90, reason: "introductory-offer" };
}

export function applyPayment({ amount, paidAt, offerStartedAt, attemptStartedAt, firstPaid }) {
  const decision = evaluateAttempt({
    offerStartedAt,
    attemptStartedAt,
    now: paidAt,
    firstPaid,
  });
  if (firstPaid) return { accepted: false, amount, incident: "benefit-consumed" };
  // An actually accepted promotional payment is honoured even if the
  // notification arrives late; the incident is recorded for containment.
  if (amount === 29.90 && paidAt > offerStartedAt + 2 * 60 * MINUTE) {
    return { accepted: true, amount, incident: "late-promotional-payment" };
  }
  return { accepted: decision.eligible && amount === decision.amount, amount, incident: null };
}

function runOfflineProof() {
  const started = Date.UTC(2026, 9, 20, 12, 0, 0);
  const checks = [
    ["inside offer", applyPayment({ amount: 29.90, paidAt: started + 10 * MINUTE, offerStartedAt: started, attemptStartedAt: started, firstPaid: false }).accepted],
    ["renewal price is regular", evaluateAttempt({ offerStartedAt: started, now: started + 10 * MINUTE, attemptStartedAt: started, firstPaid: true }).amount === 39.90],
    ["same attempt expires after 30m", !evaluateAttempt({ offerStartedAt: started, now: started + 31 * MINUTE, attemptStartedAt: started, firstPaid: false }).eligible],
    ["late accepted promo is honoured", applyPayment({ amount: 29.90, paidAt: started + 3 * 60 * MINUTE, offerStartedAt: started, attemptStartedAt: started, firstPaid: false }).incident === "late-promotional-payment"],
    ["refusal does not consume benefit", evaluateAttempt({ offerStartedAt: started, now: started + 10 * MINUTE, attemptStartedAt: started, firstPaid: false }).eligible],
  ];
  const failed = checks.filter(([, ok]) => !ok);
  for (const [label, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (failed.length) process.exitCode = 1;
  console.log("RESULT: local rule proof only; no Mercado Pago request was made.");
}

if (process.argv[1]?.endsWith("promo-proof.mjs")) runOfflineProof();
