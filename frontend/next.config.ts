import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * cacheComponents (Next.js 16) treats Math.random() in Client Components as a
   * build error during prerender. Ant Design / css-in-js still touch unstable
   * values during SSR, so we keep this off for a stable marketplace UI build.
   * We can revisit partial prerendering once auth layouts are in place.
   */
  cacheComponents: false,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
