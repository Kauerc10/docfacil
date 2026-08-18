import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  COOKIE_PREFS_KEY,
  getCookiePreferences,
  saveCookiePreferences,
} from "@/lib/services/consent-service";
import { COOKIES_VERSION } from "@/lib/legal/versions";

function createLocalStorageMock(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe("preferências de cookies", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

  beforeEach(() => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: globalThis,
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: createLocalStorageMock(),
    });
  });

  afterEach(() => {
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", originalWindow);
    } else {
      delete (globalThis as { window?: unknown }).window;
    }

    if (originalLocalStorage) {
      Object.defineProperty(globalThis, "localStorage", originalLocalStorage);
    } else {
      delete (globalThis as { localStorage?: Storage }).localStorage;
    }
  });

  it("salva a versão vigente junto da preferência", () => {
    saveCookiePreferences({
      essential: true,
      analytics: false,
      marketing: false,
      rejectedAt: 123,
    });

    const raw = localStorage.getItem(COOKIE_PREFS_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).version).toBe(COOKIES_VERSION);
  });

  it("pede novo consentimento quando a preferência é de outra versão", () => {
    localStorage.setItem(
      COOKIE_PREFS_KEY,
      JSON.stringify({
        version: "0.9",
        essential: true,
        analytics: true,
        marketing: true,
        acceptedAt: 123,
      })
    );

    expect(getCookiePreferences()).toBeNull();
  });
});
