import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Old pages, merged into the current navigation (Home · Transactions · Spending · Ask · Add).
  async redirects() {
    return [
      { source: "/top-categories", destination: "/spending", permanent: false },
      { source: "/top-vendors", destination: "/spending?view=vendor", permanent: false },
      { source: "/monthly-insights", destination: "/spending", permanent: false },
      { source: "/invest", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
