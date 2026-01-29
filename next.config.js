/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Avoid build hangs from eslint-worker; run `npm run lint` separately in CI/dev.
    ignoreDuringBuilds: true
  },
  typescript: {
    // Avoid build hangs from tsc worker; run `npx tsc --noEmit` separately.
    ignoreBuildErrors: true
  }
};

module.exports = nextConfig;
