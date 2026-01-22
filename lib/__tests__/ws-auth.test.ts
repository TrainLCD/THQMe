import { describe, it, expect } from "vitest";

describe("WebSocket Auth Token", () => {
  it("should have THQ_WS_AUTH_TOKEN environment variable set", () => {
    const token = process.env.THQ_WS_AUTH_TOKEN;
    expect(token).toBeDefined();
    expect(token).not.toBe("");
    expect(typeof token).toBe("string");
  });

  it("should have valid token format (64 character hex string)", () => {
    const token = process.env.THQ_WS_AUTH_TOKEN;
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });
});
