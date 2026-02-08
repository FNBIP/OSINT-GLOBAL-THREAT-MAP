import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disabled strict mode to prevent react-map-gl Source/Layer cleanup errors
  // caused by React 18+ double-invoking effects in dev mode.
  // This only affects development — production is unaffected.
  reactStrictMode: false,
};

export default nextConfig;
