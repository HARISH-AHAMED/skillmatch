"use client";

/**
 * Downloads just the certificate artwork as a PNG — no print dialog, no page
 * chrome. The `.certificate-sheet` node is serialised into an SVG
 * <foreignObject> with the document's own CSS inlined, rasterised on a canvas
 * at 2x for print-quality output, and handed to the browser as a file.
 *
 * Falls back to `window.print()` only if rasterisation is impossible (e.g. a
 * cross-origin image taints the canvas).
 */
export async function downloadCertificatePng(fileName = "certificate") {
  const node = document.querySelector<HTMLElement>(".certificate-sheet");
  if (!node) {
    window.print();
    return;
  }

  const rect = node.getBoundingClientRect();
  const width = Math.ceil(rect.width);
  const height = Math.ceil(rect.height);
  const scale = 2;

  try {
    const css = collectCss();
    const clone = node.cloneNode(true) as HTMLElement;
    clone.style.margin = "0";
    clone.style.transform = "none";

    const html = new XMLSerializer().serializeToString(clone);
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
      `<foreignObject width="100%" height="100%">` +
      `<div xmlns="http://www.w3.org/1999/xhtml"><style>${escapeCss(css)}</style>${html}</div>` +
      `</foreignObject></svg>`;

    const img = await loadImage(
      "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)
    );

    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitize(fileName)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    window.print();
  }
}

function sanitize(name: string) {
  return name.replace(/[^a-z0-9\-_]+/gi, "-").replace(/^-+|-+$/g, "") || "certificate";
}

function escapeCss(css: string) {
  // Keep the serialised SVG well-formed.
  return css.replace(/<\/style>/gi, "");
}

/** Same-origin stylesheet rules, concatenated. Cross-origin sheets are skipped. */
function collectCss() {
  let out = "";
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) out += rule.cssText + "\n";
    } catch {
      // cross-origin — ignore
    }
  }
  return out;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}
