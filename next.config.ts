// Force config reload
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /**
     * next/image refuses any remote host it has not been told about, and both
     * the design's editorial imagery and the seeded profile media are remote.
     * Without these the home page, the directories and every profile card fail
     * to render — a runtime-only failure, since the build never resolves a src.
     *
     * Uploaded media does not need an entry: the upload route returns either a
     * local `/uploads/...` path or a `data:` URL.
     */
    remotePatterns: [
      // Design editorial and gallery imagery (src/lib/media.ts).
      { protocol: "https", hostname: "i.pinimg.com" },
      { protocol: "https", hostname: "assets.pinterest.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      // Seeded profile avatars.
      { protocol: "https", hostname: "api.dicebear.com" },
    ],
  },
};

export default nextConfig;
