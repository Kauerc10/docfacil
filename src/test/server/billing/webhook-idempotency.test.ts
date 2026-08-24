import { describe, expect, it } from "bun:test";
import { InMemoryBillingWebhookEventsRepository } from "@/lib/server/firestore/in-memory-repositories";

type ClaimableWebhookEventsRepository = {
  claim(eventId: string, now: number): Promise<boolean>;
  complete(eventId: string, now: number): Promise<void>;
  release(eventId: string): Promise<void>;
};

function claimableRepo(): ClaimableWebhookEventsRepository {
  return new InMemoryBillingWebhookEventsRepository(true) as unknown as ClaimableWebhookEventsRepository;
}

describe("billing webhook event idempotency", () => {
  it("permite apenas um processamento concorrente para o mesmo event id", async () => {
    const repo = claimableRepo();
    const now = Date.UTC(2026, 7, 24, 19, 0, 0);

    const [first, second] = await Promise.all([
      repo.claim("log_same_event", now),
      repo.claim("log_same_event", now),
    ]);

    expect([first, second].filter(Boolean)).toHaveLength(1);
  });

  it("mantem evento concluido deduplicado e libera tentativa que falhou", async () => {
    const repo = claimableRepo();
    const now = Date.UTC(2026, 7, 24, 19, 0, 0);

    expect(await repo.claim("log_completed", now)).toBe(true);
    await repo.complete("log_completed", now + 100);
    expect(await repo.claim("log_completed", now + 200)).toBe(false);

    expect(await repo.claim("log_retry", now)).toBe(true);
    await repo.release("log_retry");
    expect(await repo.claim("log_retry", now + 200)).toBe(true);
  });
});
