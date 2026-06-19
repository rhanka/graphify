import { describe, expect, it } from "vitest";

import {
  createDefaultViewerState,
  normalizeViewerState,
  setShowOntologyClasses,
  setShowWeakLinks,
} from "../lib/viewerState.js";

describe("viewerState — showOntologyClasses (EVOL 2.a)", () => {
  it("defaults OFF (today's behaviour unchanged)", () => {
    const state = createDefaultViewerState();
    expect(state.options.showOntologyClasses).toBe(false);
    // The pre-existing weak-link default is untouched.
    expect(state.options.showWeakLinks).toBe(true);
  });

  it("setShowOntologyClasses flips the option (coerced to boolean)", () => {
    const off = createDefaultViewerState();
    const on = setShowOntologyClasses(off, true);
    expect(on.options.showOntologyClasses).toBe(true);
    // Other options are preserved.
    expect(on.options.showWeakLinks).toBe(true);

    const back = setShowOntologyClasses(on, false);
    expect(back.options.showOntologyClasses).toBe(false);

    // Truthy/falsy values coerce to a real boolean.
    expect(setShowOntologyClasses(off, 1).options.showOntologyClasses).toBe(true);
    expect(setShowOntologyClasses(off, 0).options.showOntologyClasses).toBe(false);
  });

  it("does not interfere with setShowWeakLinks", () => {
    const state = setShowOntologyClasses(createDefaultViewerState(), true);
    const next = setShowWeakLinks(state, false);
    expect(next.options.showWeakLinks).toBe(false);
    expect(next.options.showOntologyClasses).toBe(true);
  });

  it("normalizeViewerState restores the option from a partial state", () => {
    const normalized = normalizeViewerState({ options: { showOntologyClasses: true } });
    expect(normalized.options.showOntologyClasses).toBe(true);
    // Missing option falls back to the default.
    expect(normalizeViewerState({}).options.showOntologyClasses).toBe(false);
  });
});
