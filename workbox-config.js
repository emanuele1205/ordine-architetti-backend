// workbox-config.js - Configurazione Workbox per PWA - VERSIONE OTTIMIZZATA
module.exports = {
  // Build configuration
  globDirectory: 'build/',
  globPatterns: [
    '**/*.{html,js,css,png,jpg,jpeg,gif,svg,ico,json,woff,woff2,ttf,eot,webp,avif}'
  ],
  swDest: 'build/service-worker.js',
  
  // Maximum file size to precache (5MB)
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  
  // Files matching this pattern won't have their revision updated
  dontCacheBustURLsMatching: /\.\w{8}\./,
  
  // Skip waiting and claim clients immediately
  skipWaiting: true,
  clientsClaim: true,
  
  // Clean up outdated caches
  cleanupOutdatedCaches: true,
  
  // Exclude specific files from precaching
  globIgnores: [
    '**/node_modules/**/*',
    '**/*.map',
    '**/coverage/**/*',
    '**/tests/**/*',
    '**/stories/**/*',
    '**/.DS_Store',
    '**/Thumbs.db',
    '**/desktop.ini'
  ],
  
  // Navigation fallback
  navigateFallback: '/index.html',
  navigateFallbackDenylist: [
    /^\/_/,
    /\/[^/?]+\.[^/]+$/,
    /\/api\//,
    /\/socket\.io\//,
    /\/sockjs-node\//
  ],
  
  // Runtime caching strategies
  runtimeCaching: [
    // API endpoints - Network First with fallback
    {
      urlPattern: /^http:\/\/localhost:5000\/api\/(info|stats|architects|courses|news)$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache-v1',
        networkTimeoutSeconds: 5,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
          purgeOnQuotaError: true
        },
        cacheKeyWillBeUsed: async ({ request }) => {
          // Add timestamp to API requests for cache busting
          const url = new URL(request.url);
          url.searchParams.set('_cacheBuster', Math.floor(Date.now() / 60000).toString());
          return url.toString();
        },
        plugins: [
          {
            cacheWillUpdate: async ({ response }) => {
              return response.status === 200 ? response : null;
            },
            cacheDidUpdate: async ({ cacheName, request, oldResponse, newResponse }) => {
              console.log(`Cache updated: ${request.url}`);
            }
          }
        ]
      }
    },
    
    // Authentication APIs - Network Only
    {
      urlPattern: /^http:\/\/localhost:5000\/api\/(auth|messages|upload|users)/,
      handler: 'NetworkOnly',
      options: {
        cacheName: 'auth-cache-v1'
      }
    },
    
    // Images - Cache First with fallback
    {
      urlPattern: /\.(?:png|gif|jpg|jpeg|svg|webp|avif|ico)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images-cache-v1',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          purgeOnQuotaError: true
        },
        plugins: [
          {
            cacheKeyWillBeUsed: async ({ request }) => {
              // Use original URL for images
              return request.url;
            }
          }
        ]
      }
    },
    
    // Static assets - Stale While Revalidate
    {
      urlPattern: /\.(?:js|css)$/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-cache-v1',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
          purgeOnQuotaError: true
        }
      }
    },
    
    // Google Fonts stylesheets
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'google-fonts-stylesheets-v1',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          purgeOnQuotaError: true
        }
      }
    },
    
    // Google Fonts webfonts
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts-v1',
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          purgeOnQuotaError: true
        },
        cacheKeyWillBeUsed: async ({ request }) => {
          return request.url.replace(/\?.*$/, '');
        }
      }
    },
    
    // CDN resources (like CDNJS, unpkg, etc.)
    {
      urlPattern: /^https:\/\/(cdnjs\.cloudflare\.com|unpkg\.com|cdn\.jsdelivr\.net)\//,
      handler: 'CacheFirst',
      options: {
        cacheName: 'cdn-cache-v1',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          purgeOnQuotaError: true
        }
      }
    },
    
    // Other origins - Network First
    {
      urlPattern: /^https:\/\/(?!localhost)/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'external-cache-v1',
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 60 * 60, // 1 hour
          purgeOnQuotaError: true
        }
      }
    }
  ],
  
  // Additional manifest entries for specific files
  additionalManifestEntries: [
    {
      url: '/offline.html',
      revision: null
    }
  ],
  
  // Manifest transformations
  manifestTransforms: [
    (manifestEntries) => {
      // Transform manifest entries if needed
      const manifest = manifestEntries.map((entry) => {
        // Don't add revision hash to HTML files for better caching
        if (entry.url.endsWith('.html')) {
          entry.revision = null;
        }
        
        // Add custom headers information
        if (entry.url.includes('.js') || entry.url.includes('.css')) {
          entry.headers = {
            'Cache-Control': 'public, max-age=31536000' // 1 year
          };
        }
        
        return entry;
      });
      
      return {
        manifest,
        warnings: []
      };
    }
  ],
  
  // Mode configuration
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  
  // Source map generation
  sourcemap: process.env.NODE_ENV !== 'production',
  
  // Disable built-in routing for custom SW
  disableDevLogs: process.env.NODE_ENV === 'production',
  
  // Injection point for custom code
  swSrc: 'public/service-worker-template.js',
  
  // Offline fallbacks
  offlineGoogleAnalytics: false,
  
  // Import scripts for additional functionality
  importScripts: [
    // Add any additional scripts here if needed
    // 'background-sync.js',
    // 'push-notifications.js'
  ],
  
  // Define custom handlers
  handlers: [
    {
      urlPattern: /\/api\/.*\.json$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'json-api-cache',
        networkTimeoutSeconds: 5
      }
    }
  ],
  
  // Background sync configuration
  backgroundSync: {
    name: 'architetti-background-sync',
    options: {
      maxRetentionTime: 24 * 60 // 24 hours in minutes
    }
  },
  
  // Broadcast update configuration
  broadcastUpdate: {
    channelName: 'architetti-update-channel',
    options: {
      generatePayload: ({ cacheName, updatedURL }) => {
        return {
          type: 'CACHE_UPDATED',
          payload: {
            cacheName,
            updatedURL,
            timestamp: Date.now()
          }
        };
      }
    }
  }
};