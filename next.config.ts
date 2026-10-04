import type { NextConfig } from "next";

// This app is the ADMIN deployment (editor + content storage). The public website is a separate app
// that reads /api/public/content, so keep this domain out of search engines.
const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default nextConfig;
