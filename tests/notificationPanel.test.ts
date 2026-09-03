import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The notification panel was anchored with `right-0`, which aligns it to the
 * bell — but the bell is not the last thing in the header, the avatar is. At
 * 375px that put the panel's right edge 61px in from the viewport and its left
 * edge 23px off the screen: clipped on one side, visibly off-centre on the
 * other.
 *
 * The geometry is verified in a browser; these guard the two decisions that
 * are easy to undo by accident.
 */
const SOURCE = readFileSync(
  join(process.cwd(), "src/components/layout/NotificationCenter.tsx"),
  "utf8"
);

describe("the notification panel stays on screen on mobile", () => {
  it("switches to a viewport-anchored sheet below the sm breakpoint", () => {
    expect(SOURCE).toContain('position: "fixed"');
    // Equal margins measured from the viewport, not from the button.
    expect(SOURCE).toMatch(/left:\s*12,\s*right:\s*12/);
  });

  it("asks the same question the CSS asks, rather than a max-width", () => {
    /*
     * A viewport can sit on a fractional width — device emulation and browser
     * zoom both produce them — and at 639.x neither `max-width: 639px` nor
     * `min-width: 640px` matches. Written as a max-width this left a
     * one-pixel band where the sheet had been dismissed and the anchored panel
     * had not yet taken over.
     */
    expect(SOURCE).toContain('matchMedia("(min-width: 640px)")');
    // Scoped to the call, not the prose: the comment above it names the query
    // it deliberately does not use.
    expect(SOURCE).not.toMatch(/matchMedia\(\s*"\(max-width/);
  });

  it("keeps the anchored dropdown as the desktop layout", () => {
    // The classes still describe the desktop panel; the inline style only
    // overrides them on mobile, so desktop is unchanged by construction.
    expect(SOURCE).toContain("absolute right-0 top-[calc(100%+8px)]");
  });

  it("caps the list against the viewport so a long feed scrolls", () => {
    expect(SOURCE).toContain("max-h-[min(420px,60svh)]");
    expect(SOURCE).toContain("overflow-y-auto");
  });

  it("measures against the trigger rather than a hardcoded header height", () => {
    // The component mounts in two headers of different heights.
    expect(SOURCE).toContain("buttonRef.current?.getBoundingClientRect()");
  });
});
