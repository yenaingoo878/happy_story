// import { defineConfig, loadEnv } from 'vite';
// import react from '@vitejs/plugin-react';

// export default defineConfig(({ mode }) => {
//   // Load env file based on `mode` in the current working directory.
//   // Fix: Cast process to any as 'cwd' property might be missing on Process type definition in this context
//   const env = loadEnv(mode, (process as any).cwd(), '');
  

//   return {
//     plugins: [
//       react()
//     ],
//     base: process.env.VITE_BASE_PATH || "/little-kids/",
//     define: {
//       // Polyfill process.env.API_KEY so it is available at runtime
//       // Support both API_KEY and GEMINI_API_KEY
//       'process.env.API_KEY': JSON.stringify(env.API_KEY || env.GEMINI_API_KEY || '')
//     },
//     build: {
//       outDir: 'dist',
//       sourcemap: false,
//       // Increase warning limit to prevent build warnings for large vendor files
//       chunkSizeWarningLimit: 2000,
//       rollupOptions: {
//         output: {
//           // Use a simple vendor chunk strategy to avoid circular dependency issues
//           manualChunks: (id) => {
//             if (id.includes('node_modules')) {
//               return 'vendor';
//             }
//           }
//         }
//       }
//     },
//     server: {
//       port: 3000,
//     }
//   };
// });

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Fix: Cast process to any as 'cwd' property might be missing on Process type definition in this context
  const env = loadEnv(mode, (process as any).cwd(), '');
  

  return {
    plugins: [
      react()
    ],
    // ပြင်ဆင်ချက်: Cloudflare Pages အတွက် base path ကို '/' သို့ ပြောင်းလဲခြင်း။
    // VITE_BASE_PATH သည် GitHub Pages အတွက် သီးသန့်ဖြစ်ပြီး၊ မသတ်မှတ်ထားပါက '/' ကို Default အဖြစ်ထားခြင်း။
    base: process.env.VITE_BASE_PATH || "/", 
    define: {
      // Polyfill process.env.API_KEY so it is available at runtime
      // Support both API_KEY and GEMINI_API_KEY
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.GEMINI_API_KEY || '')
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      // Increase warning limit to prevent build warnings for large vendor files
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          // Use a simple vendor chunk strategy to avoid circular dependency issues
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          }
        }
      }
    },
    server: {
      port: 3000,
    }
  };
});
