import assert from "node:assert/strict";
import test from "node:test";
import { applyPayment, evaluateAttempt } from "./promo-proof.mjs";

const started = Date.UTC(2026, 9, 20, 12, 0, 0);

test("first approved attempt uses the introductory amount", () => {
  assert.deepEqual(
    applyPayment({ amount: 29.90, paidAt: started + 1_000, offerStartedAt: started, attemptStartedAt: started, firstPaid: false }),
    { accepted: true, amount: 29.90, incident: null },
  );
});

test("a consumed benefit selects the regular renewal amount", () => {
  assert.equal(evaluateAttempt({ offerStartedAt: started, now: started + 1_000, attemptStartedAt: started, firstPaid: true }).amount, 39.90);
});

test("attempt expires after thirty minutes", () => {
  assert.equal(evaluateAttempt({ offerStartedAt: started, now: started + 30 * 60_000 + 1, attemptStartedAt: started, firstPaid: false }).reason, "attempt-expired");
});

test("late promotional payment is honoured and flagged", () => {
  assert.deepEqual(
    applyPayment({ amount: 29.90, paidAt: started + 3 * 60 * 60_000, offerStartedAt: started, attemptStartedAt: started, firstPaid: false }),
    { accepted: true, amount: 29.90, incident: "late-promotional-payment" },
  );
});
