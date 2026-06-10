// server.js (cPanel Startup File)
// File ini digunakan oleh Phusion Passenger di cPanel untuk memulai aplikasi Node.js.
// Pastikan Anda telah menjalankan perintah 'npm run build' sebelum mengunggah proyek ke cPanel.

import path from 'path';

// Menetapkan environment secara otomatis ke production untuk optimasi performa dan static serving
process.env.NODE_ENV = 'production';

// Menetapkan port default jika cPanel/Passenger melampirkan port dinamis pada process.env.PORT
if (!process.env.PORT) {
  process.env.PORT = '3000';
}

console.log('[cPanel Runner] Memulai server SPMB SDN Cibojong 1 di lingkungan produksi...');
console.log('[cPanel Runner] Melakukan redirect eksekusi ke ./dist/server.cjs');

// Mengimpor module hasil bundel esbuild secara nirlaras menggunakan standard import
import './dist/server.cjs';

