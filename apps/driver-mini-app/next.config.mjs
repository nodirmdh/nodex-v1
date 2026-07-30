import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
  analyzerMode: "static",
  reportFilename: "../../../artifacts/bundle/driver/analyzer.html",
});

export default withBundleAnalyzer({
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: ["@nodex/ui", "@nodex/testing"],
});
