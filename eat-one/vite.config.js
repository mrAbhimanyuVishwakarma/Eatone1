import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],build:{outDir:'dist'},server:{host:'127.0.0.1',watch:{usePolling:process.platform==='win32',interval:250,ignored:['**/data/**','**/uploads/**','**/test-results/**']}}});
