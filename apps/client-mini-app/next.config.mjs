import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
  analyzerMode: "static",
  reportFilename: "../../../artifacts/bundle/client/analyzer.html",
});

const nextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: ["@nodex/ui", "@nodex/testing"],
  experimental: {},
};

export default withBundleAnalyzer(nextConfig);
