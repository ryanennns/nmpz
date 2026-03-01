import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
    const isTest = mode === 'test' || process.env.VITEST === 'true';

    return {
        plugins: [
            ...(!isTest
                ? [
                      laravel({
                          input: [
                              'resources/css/app.css',
                              'resources/js/app.tsx',
                          ],
                          ssr: 'resources/js/ssr.tsx',
                          refresh: true,
                      }),
                      wayfinder({
                          formVariants: true,
                      }),
                  ]
                : []),
            react({
                babel: {
                    plugins: ['babel-plugin-react-compiler'],
                },
            }),
            tailwindcss(),
        ],
        esbuild: {
            jsx: 'automatic',
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, 'resources/js'),
            },
        },
        server: {
            watch: {
                ignored: ['**/likeacw-mapillary.jsonl'],
            },
        },
        test: {
            environment: 'jsdom',
            setupFiles: ['resources/js/test/setup.ts'],
        },
    };
});
