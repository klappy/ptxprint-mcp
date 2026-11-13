import { describe, expect, it } from "vitest";
import { ENGINE_LOCK, engineFingerprint, renderHash } from "../src/engine.js";

describe("render engine isolation", () => {
  it("matches Python compact sorted JSON fingerprint", async () => {
    expect(await engineFingerprint({schema:1,ptxprint:{version:"3.1.6",commit:"a11c7e4e9620908b925ba5fd2ab046dfa918a132"},usfmtc:{commit:"e72a391389e9cd516402ba5f2cfd81ff859ca762"},render_revision:1})).toBe("acc3adf8038934d601c04d4c4593252649e756e6250f7c4d487a424d423f3d18");
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
