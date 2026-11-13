import { describe, expect, it } from "vitest";
import { ENGINE_LOCK, engineFingerprint, renderHash } from "../src/engine.js";

describe("render engine isolation", () => {
  it("matches Python compact sorted JSON fingerprint", async () => {
    expect(await engineFingerprint()).toBe("acc3adf8038934d601c04d4c4593252649e756e6250f7c4d487a424d423f3d18");
  });
  it("is stable for equivalent lock key ordering", async () => {
    expect(await engineFingerprint({a:1,b:2})).toBe(await engineFingerprint({b:2,a:1}));
  });
  it("separates old/new engines without changing the input digest", async () => {
    const payload = "a".repeat(64);
    const current = await engineFingerprint();
    const changed = await engineFingerprint({...ENGINE_LOCK, render_revision:2});
    expect(await renderHash(payload,current)).not.toBe(await renderHash(payload,changed));
    expect(await renderHash(payload,current)).not.toBe(payload);
    expect(await renderHash(payload,current)).toBe(await renderHash(payload,current));
    expect(payload).toBe("a".repeat(64));
  });
  it("changes when either immutable engine dependency changes", async () => {
    expect(await engineFingerprint()).not.toBe(await engineFingerprint({...ENGINE_LOCK,usfmtc:{commit:"f".repeat(40)}}));
    expect(await engineFingerprint()).not.toBe(await engineFingerprint({...ENGINE_LOCK,ptxprint:{...ENGINE_LOCK.ptxprint,commit:"f".repeat(40)}}));
  });
});
