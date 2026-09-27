import {defineConfig, loadEnv} from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import {ElementPlusResolver} from 'unplugin-vue-components/resolvers'
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
    const env = loadEnv(mode, process.cwd(), 'VITE')
    return {
        server: {
            host: true,
            port: 3001,
            hmr: true,
        },
        base: env.VITE_STATIC_URL || '/',
        plugins: [vue(),
            VitePWA({
                registerType: 'autoUpdate',
                injectRegister: 'script-defer',
                manifest: {
                    id: '/',
                    name: env.VITE_PWA_NAME || 'Cloud Mail',
                    short_name: env.VITE_PWA_NAME || 'Cloud Mail',
                    description: '可安裝、支援繁體中文的 Cloud Mail 郵件服務',
                    lang: 'zh-TW',
                    start_url: '/',
                    scope: '/',
                    display: 'standalone',
                    orientation: 'any',
                    background_color: '#FFFFFF',
                    theme_color: '#1976D2',
                    categories: ['productivity', 'utilities'],
                    icons: [
                        {
                            src: 'mail-pwa.png',
                            sizes: '192x192',
                            type: 'image/png',
                            purpose: 'any'
                        },
                        {
                            src: 'mail-pwa-512.png',
                            sizes: '512x512',
                            type: 'image/png',
                            purpose: 'any maskable'
                        },
                        {
                            src: 'app-icon.svg',
                            sizes: 'any',
                            type: 'image/svg+xml',
                            purpose: 'any maskable'
                        }
                    ],
                },
                workbox: {
                    disableDevLogs: true,
                    importScripts: ['notification-sw.js'],
                    globPatterns: [
                        'index.html',
                        'registerSW.js',
                        'manifest.webmanifest',
                        'assets/**/*.{js,css,png,svg}',
                        'mail*.png',
                        'app-icon.svg'
                    ],
                    navigateFallback: '/index.html',
                    navigateFallbackDenylist: [/^\/api\//, /^\/attachments\//, /^\/static\//],
                    runtimeCaching: [
                        {
                            urlPattern: /^https:\/\/api\.iconify\.design\//,
                            handler: 'CacheFirst',
                            options: {
                                cacheName: 'iconify-icons',
                                expiration: {maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30}
                            }
                        }
                    ],
                    cleanupOutdatedCaches: true,
                }
            }),
            AutoImport({
                resolvers: [ElementPlusResolver()],
            }),
            Components({
                resolvers: [ElementPlusResolver()],
            })
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, 'src')
            }
        },
        build: {
            target: 'es2022',
            outDir: env.VITE_OUT_DIR || 'dist',
            emptyOutDir: true,
            assetsInclude: ['**/*.json'],
            rollupOptions: {
                output: {
                    manualChunks(id) {
                        if (!id.includes('node_modules')) return
                        const normalized = id.replace(/\\/g, '/')
                        if (normalized.includes('/zrender/')) return 'charts-renderer'
                        if (normalized.includes('/echarts/')) {
                            if (normalized.includes('/echarts/lib/chart/')) return 'charts-types'
                            if (normalized.includes('/echarts/lib/component/')) return 'charts-components'
                            return 'charts-core'
                        }
                        if (normalized.includes('/element-plus/')) {
                            const match = normalized.match(/\/element-plus\/es\/components\/([^/]+)/)
                            const component = match?.[1]
                            if (['table', 'table-v2', 'tree', 'tree-select', 'pagination'].includes(component)) return 'element-data'
                            if (['dialog', 'drawer', 'message', 'message-box', 'notification', 'popover', 'tooltip', 'popper'].includes(component)) return 'element-overlay'
                            if (['input', 'input-number', 'select', 'select-v2', 'form', 'switch', 'radio', 'checkbox', 'date-picker', 'time-picker', 'upload'].includes(component)) return 'element-form'
                            return component ? 'element-ui' : 'element-core'
                        }
                        if (id.includes('@iconify')) return 'icons'
                        if (id.includes('dompurify')) return 'mail-sanitizer'
                        if (id.includes('/vue/') || id.includes('vue-router') || id.includes('vue-i18n') || id.includes('pinia')) return 'vue-core'
                        return 'vendor'
                    }
                }
            }
        }
    }
})
