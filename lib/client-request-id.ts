export function createClientRequestId() {
  const browserCrypto = globalThis.crypto;
  if (browserCrypto && typeof browserCrypto.randomUUID === "function") {
    return browserCrypto.randomUUID();
  }

  return `request-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
