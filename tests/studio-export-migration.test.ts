import { mkdtempSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { removeLegacyGraphViz } from "../src/studio-export.js";

describe("removeLegacyGraphViz (legacy graph.html migration cleanup)", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
  });

  it("deletes a stale legacy graph viz and reports it, idempotently", () => {
    const stateDir = mkdtempSync(join(tmpdir(), "graphify-migrate-"));
    dirs.push(stateDir);
    const legacy = join(stateDir, "graph" + ".html");
    writeFileSync(legacy, "<html>legacy vis-network</html>");
    expect(existsSync(legacy)).toBe(true);

    // First emit: the stale viz is erased and the cleanup is reported.
    expect(removeLegacyGraphViz(stateDir)).toBe(true);
    expect(existsSync(legacy)).toBe(false);

    // Second emit on an already-clean state dir: no-op, nothing to report.
    expect(removeLegacyGraphViz(stateDir)).toBe(false);
  });

  it("is a safe no-op when there is no legacy viz", () => {
    const stateDir = mkdtempSync(join(tmpdir(), "graphify-migrate-"));
    dirs.push(stateDir);
    expect(removeLegacyGraphViz(stateDir)).toBe(false);
  });
});
