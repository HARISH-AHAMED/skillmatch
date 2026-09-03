import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /**
     * next/image refuses any remote host it has not been told about, and both
     * the design's editorial imagery and the seeded profile media are remote.
     * Without these the home page, the directories and every profile card fail
     * to render — a runtime-only failure, since the build never resolves a src.
     *
     * Uploaded media needs no entry: it is served same-origin from
     * /api/media/<id>.
     */
    remotePatterns: [
      // Design editorial and gallery imagery (src/lib/media.ts).
      { protocol: "https", hostname: "i.pinimg.com" },
      { protocol: "https", hostname: "assets.pinterest.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      // Seeded profile avatars.
      { protocol: "https", hostname: "api.dicebear.com" },
    ],

    /**
     * AVIF first, then WebP. Both are markedly smaller than the JPEG/PNG the
     * sources actually serve, and every browser that reaches this app supports
     * at least one of them.
     */
    formats: ["image/avif", "image/webp"],

    /**
     * An optimized image is addressed by (src, width, quality), so the result
     * can be cached for as long as the source is stable. The default is 60
     * seconds, which had the optimizer re-encoding the same card artwork all
     * day. Uploaded media is content-addressed and can never change under its
     * URL; the remote editorial images are immutable CDN objects.
     */
    minimumCacheTTL: 31536000,

    /**
     * Card and avatar artwork is small. Without this, every `sizes` hint below
     * 640px still resolves to a 640px encode.
     */
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  /**
   * Vercel already serves brotli, so no compression middleware is involved;
   * this only matters when the app runs behind something that does not.
   */
  compress: true,

  /** The framework's version header buys an attacker information and nothing else. */
  poweredByHeader: false,

  async headers() {
    return [
      {
        /**
         * Uploaded media is content-addressed — the id is the sha-256 of the
         * bytes — so a URL can never come to mean different content. The route
         * sets this too; declaring it here means the CDN edge honours it even
         * for responses it serves without invoking the function.
         */
        source: "/api/media/:id",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      /**
       * Fingerprinted build output — safe to pin forever, but only in a real
       * build. The dev server reuses stable asset names across edits, so an
       * immutable header there makes the browser hold a stale stylesheet and
       * silently ignore every CSS change.
       */
      ...(process.env.NODE_ENV === "production"
        ? [
            {
              source: "/_next/static/:path*",
              headers: [
                { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
              ],
            },
          ]
        : []),
    ];
  },
};

export default nextConfig;
