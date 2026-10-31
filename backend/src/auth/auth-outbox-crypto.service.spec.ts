import { ConfigService } from "@nestjs/config";

import { AuthOutboxCryptoService } from "./auth-outbox-crypto.service";

describe("AuthOutboxCryptoService", () => {
  const config = {
    getOrThrow: jest.fn(() => "outbox-test-secret-with-enough-length"),
  } as unknown as ConfigService;
  const service = new AuthOutboxCryptoService(config);

  it("round-trips plaintext through AES-256-GCM", () => {
    const plaintext = "verify-email:an@example.com";
    const encrypted = service.encrypt(plaintext);

    expect(encrypted).not.toContain(plaintext);
    expect(encrypted.split(".")).toHaveLength(3);
    expect(service.decrypt(encrypted)).toBe(plaintext);
  });

  it("produces a different ciphertext on each encrypt", () => {
    const first = service.encrypt("same-payload");
    const second = service.encrypt("same-payload");
    expect(first).not.toBe(second);
  });

  it("rejects a malformed ciphertext", () => {
    expect(() => service.decrypt("not-valid")).toThrow(
      "Invalid encrypted outbox value.",
    );
    expect(() => service.decrypt("a.b.c.d")).toThrow(
      "Invalid encrypted outbox value.",
    );
  });
});
