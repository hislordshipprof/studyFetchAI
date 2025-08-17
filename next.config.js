/** @type {import('next').NextConfig} */
const nextConfig = {
  // Experimental features for Next.js 15
  experimental: {
    // Server actions configuration (object instead of boolean)
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },

  // Turbopack configuration (instead of webpack for development)
  turbo: {
    rules: {
      '*.node': {
        loaders: ['raw-loader'],
      },
    },
    resolveAlias: {
      // Handle Node.js modules in Turbopack
      fs: false,
      path: false,
      crypto: false,
      stream: false,
      util: false,
    },
  },

  // Webpack configuration (fallback for production builds)
  webpack: (config, { isServer, dev }) => {
    // Only apply webpack config in production or when not using Turbopack
    if (!dev || !process.env.TURBOPACK) {
      // Handle pdf-parse and similar libraries
      if (isServer) {
        config.externals = config.externals || [];
        
        // Don't bundle pdf-parse dependencies on the server
        config.externals.push({
          'canvas': 'canvas',
          'sharp': 'sharp',
        });
      }

      // Handle Node.js modules in the browser
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          path: false,
          crypto: false,
          stream: false,
          util: false,
          buffer: false,
        };
      }

      // Add specific handling for pdf-parse
      config.module.rules.push({
        test: /\.node$/,
        use: 'raw-loader',
      });
    }

    return config;
  },

  // Headers configuration
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
