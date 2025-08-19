/** @type {import('next').NextConfig} */
const nextConfig = {
  // Moved from experimental to root level as per Next.js 15 migration
  serverExternalPackages: ['mupdf'],

  // Experimental features for Next.js 15
  experimental: {
    // Server actions configuration (object instead of boolean)
    serverActions: {
      allowedOrigins: ['localhost:3000'],
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

      // Handle Node.js modules in the browser - comprehensive fallbacks for MuPDF.js
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          path: false,
          crypto: false,
          stream: false,
          util: false,
          buffer: false,
          module: false, // Fix for MuPDF.js "Can't resolve 'module'" error
          url: false,
          os: false,
          assert: false,
          constants: false,
          child_process: false,
          worker_threads: false,
          perf_hooks: false,
          async_hooks: false,
        };

        // Ignore MuPDF.js completely on client side
        config.externals = config.externals || [];
        config.externals.push({
          'mupdf': 'mupdf',
        });
      }

      // Handle WebAssembly files for MuPDF.js
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true,
        syncWebAssembly: true,
        layers: true,
      };

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
