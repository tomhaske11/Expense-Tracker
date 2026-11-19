import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pages merged into the new navigation (Home · Transactions · Spending · Ask · Add).
  async redirects() {
    return [
      { source: "/top-categories", destination: "/spending", permanent: false },
      { source: "/top-vendors", destination: "/spending?view=vendor", permanent: false },
      { source: "/monthly-insights", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
