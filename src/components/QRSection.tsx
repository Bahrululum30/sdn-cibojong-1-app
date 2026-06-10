import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QrCode, Smartphone, Download, Copy, Check, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';

export default function QRSection() {
  const [copied, setCopied] = useState(false);
  const [urlType, setUrlType] = useState<'production' | 'preview'>('production');

  const productionUrl = "https://sdncibojong1.sch.id/formulir";
  const getPreviewUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/formulir`;
    }
    return productionUrl;
  };

  const activeUrl = urlType === 'production' ? productionUrl : getPreviewUrl();
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=450x450&color=1e3a8a&data=${encodeURIComponent(activeUrl)}`;

  // Robust clipboard copying function with legacy fallback for iframes or mobile browsers
  const handleCopyLink = () => {
    // URL Validation
    try {
      if (!activeUrl || !activeUrl.startsWith('http')) {
        throw new Error('Alamat URL tidak valid.');
      }
      
      const copyPromise = () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          return navigator.clipboard.writeText(activeUrl);
        } else {
          // Legacy/Iframe fallback
          const textarea = document.createElement('textarea');
          textarea.value = activeUrl;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          try {
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return Promise.resolve();
          } catch (err) {
            document.body.removeChild(textarea);
            return Promise.reject(err);
          }
        }
      };

      copyPromise()
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          
          // Modern toast notification on top-right
          Swal.fire({
            icon: 'success',
            title: 'Tautan Berhasil Disalin!',
            html: `<div class="text-xs text-slate-600 text-left mt-1 font-mono bg-slate-100 p-2 rounded border break-all">${activeUrl}</div>`,
            timer: 3000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end',
            timerProgressBar: true
          });
        })
        .catch((err) => {
          console.error('Failed to copy text:', err);
          Swal.fire({
            icon: 'error',
            title: 'Gagal Menyalin Tautan',
            text: 'Silakan salin tautan secara manual dari kolom teks.',
            confirmButtonColor: '#2563EB'
          });
        });
    } catch (e: any) {
      Swal.fire({
        icon: 'error',
        title: 'URL Tidak Valid',
        text: e.message || 'Harap periksa kembali format URL.',
        confirmButtonColor: '#EF4444'
      });
    }
  };

  const handleDownloadQR = () => {
    const link = document.createElement('a');
    link.href = qrImageUrl;
    link.target = '_blank';
    link.download = `QR_CODE_SPMB_SDN_CIBOJONG_1_${urlType}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Swal.fire({
      icon: 'success',
      title: 'QR Code Terbuka!',
      text: 'File gambar QR Code telah dibuka di tab baru. Silakan klik kanan atau sentuh lama pada gambar untuk mengunduh/menyimpannya.',
      confirmButtonColor: '#2563EB'
    });
  };

  return (
    <section id="qr-code-section" className="py-20 bg-gradient-to-b from-white via-slate-50 to-blue-50/20 border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Block */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200/60 rounded-full text-xs font-bold text-blue-700 uppercase tracking-wider">
            <QrCode className="h-3.5 w-3.5 animate-pulse" />
            <span>Akses Cepat Pendaftaran</span>
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            QR Code &amp; Tautan Formulir SPMB
          </h2>
          <div className="h-1 bg-gradient-to-r from-blue-600 to-indigo-600 w-24 mx-auto rounded-full" />
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
            Guru, panitia, dan orang tua dapat melakukan scan barcode ini melalui kamera ponsel atau membagikan tautan formulir pendaftaran secara langsung.
          </p>
        </div>

        {/* Content Box Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Column Left: High tech Scanning Visual Phone Mockup */}
          <div className="lg:col-span-5 flex justify-center order-2 lg:order-1">
            <div className="relative w-64 h-[380px] bg-slate-950 rounded-[38px] p-2 shadow-2xl ring-8 ring-slate-900/95 flex flex-col justify-between overflow-hidden">
              
              {/* Speaker & camera sensor dot notch */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-5.5 bg-slate-900 rounded-b-2xl z-30 flex items-center justify-center">
                <div className="w-10 h-0.5 bg-slate-800 rounded-full mb-0.5"></div>
                <div className="w-1.5 h-1.5 bg-slate-800 rounded-full ml-2 mb-0.5"></div>
              </div>

              {/* Top info row */}
              <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 px-4 pt-3.5 z-20">
                <span>Cibojong-NET</span>
                <span className="flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[8px] tracking-wider uppercase">Online</span>
                </span>
              </div>

              {/* Main scan frame */}
              <div className="flex-grow flex flex-col items-center justify-center relative my-3 p-3 z-10">
                
                {/* Laser scan horizontal moving line */}
                <motion.div 
                  initial={{ top: '15%' }}
                  animate={{ top: '80%' }}
                  transition={{ 
                    repeat: Infinity, 
                    repeatType: 'reverse', 
                    duration: 3, 
                    ease: 'easeInOut' 
                  }}
                  className="absolute left-[18%] right-[18%] h-0.5 bg-gradient-to-r from-blue-500 via-emerald-400 to-blue-500 shadow-[0_0_8px_#10b981] z-20"
                />

                {/* Framing design corners */}
                <div className="absolute top-3 left-4 w-4 h-4 border-t-2 border-l-2 border-emerald-500 rounded-tl-sm" />
                <div className="absolute top-3 right-4 w-4 h-4 border-t-2 border-r-2 border-emerald-500 rounded-tr-sm" />
                <div className="absolute bottom-3 left-4 w-4 h-4 border-b-2 border-l-2 border-emerald-500 rounded-bl-sm" />
                <div className="absolute bottom-3 right-4 w-4 h-4 border-b-2 border-r-2 border-emerald-500 rounded-br-sm" />

                {/* Standard White QR wrapper border - made more compact! */}
                <div className="bg-white p-2.5 rounded-xl shadow-lg border border-slate-850/20 max-w-xs transition-transform hover:scale-105 duration-300">
                  <img
                    src={qrImageUrl}
                    alt="Scan Code QR sdncibojong1.sch.id/formulir"
                    referrerPolicy="no-referrer"
                    className="w-36 h-36 object-contain"
                  />
                </div>
              </div>

              {/* Foot lock guidelines */}
              <div className="text-center px-4 pb-3 z-20">
                <span className="font-mono text-[8px] text-slate-400 block uppercase tracking-widest mb-0.5">Arahkan Kamera Ke QR</span>
                <p className="text-[8px] font-medium text-slate-300 break-all bg-slate-900/40 py-0.5 px-1.5 rounded font-mono truncate">{activeUrl}</p>
              </div>

              {/* Home swipe indicator bar */}
              <div className="w-20 h-0.5 bg-white/40 mx-auto mb-1 rounded-full z-20" />
            </div>
          </div>

          {/* Column Right: Informative Guidelines and Actions */}
          <div className="lg:col-span-7 space-y-6 order-1 lg:order-2">
            
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-blue-600 uppercase tracking-widest block">
                INTEGRASI SISTEM ALUR SPMB
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-850 tracking-tight leading-tight">
                Fleksibilitas Sosialisasi Offline ke Formulir Online
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Panitia penerimaan siswa (SPMB) sekolah dapat memasang barcode QR Code ini pada banner besar di depan halaman sekolah, pamflet brosur, papan pengumuman desa atau status WhatsApp grup pendaftaran agar orang tua dapat langsung mengisi formulir dari ponsel mereka.
              </p>
            </div>

            {/* URL Selector Area */}
            <div className="bg-slate-100/80 p-4 rounded-2xl border border-slate-205/60 space-y-3">
              <span className="text-xs font-bold text-slate-700 block">Pilih Target Tautan QR &amp; Bagikan:</span>
              
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/50 rounded-xl">
                <button
                  type="button"
                  onClick={() => setUrlType('production')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${ urlType === 'production' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80' }`}
                >
                  Domain Resmi (Aktif)
                </button>
                <button
                  type="button"
                  onClick={() => setUrlType('preview')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${ urlType === 'preview' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80' }`}
                >
                  Preview Server (Uji Coba)
                </button>
              </div>

              {/* Dynamic Display Teks URL */}
              <div className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 font-mono shadow-inner overflow-hidden">
                <span className="text-slate-400 select-none font-sans font-bold text-[10px] uppercase shrink-0">Link:</span>
                <span className="truncate flex-grow">{activeUrl}</span>
              </div>
            </div>

            {/* Instruction list */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200/40 shadow-sm space-y-1.5">
                <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">1</div>
                <h4 className="font-bold text-xs text-slate-805">Pindai / Scan QR</h4>
                <p className="text-[11px] text-slate-500 leading-normal">Buka kamera smartphone bawaan dan arahkan ke barcode di samping.</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/40 shadow-sm space-y-1.5">
                <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">2</div>
                <h4 className="font-bold text-xs text-slate-850">Input File &amp; Data</h4>
                <p className="text-[11px] text-slate-500 leading-normal">Orang tua calon murid mengisikan biodata akurat sesuai berkas asli.</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/40 shadow-sm space-y-1.5">
                <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">3</div>
                <h4 className="font-bold text-xs text-slate-850">Cetak &amp; Selesai</h4>
                <p className="text-[11px] text-slate-500 leading-normal">Data masuk server admin pendaftar, cetak formulir dalam bentuk PDF!</p>
              </div>
            </div>

            {/* Quick action buttons block */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownloadQR}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-blue-500/10 cursor-pointer hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all text-xs sm:text-sm"
              >
                <Download className="h-4.5 w-4.5" />
                <span>Unduh QR Code</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold px-6 py-3.5 rounded-xl shadow-sm cursor-pointer hover:shadow hover:scale-[1.01] active:scale-[0.99] transition-all text-xs sm:text-sm"
              >
                {copied ? <Check className="h-4.5 w-4.5 text-emerald-500" /> : <Copy className="h-4.5 w-4.5 text-slate-505" />}
                <span>{copied ? 'Link Berhasil Disalin!' : 'Salin URL Formulir'}</span>
              </button>
            </div>

            {/* Tips alert banner info */}
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200/60 rounded-xl p-3.5 max-w-xl text-amber-900 shadow-sm">
              <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[10.5px] leading-relaxed">
                <strong>Tips Verifikasi Seluler:</strong> Gunakan opsi <strong>&ldquo;Preview Server&rdquo;</strong> apabila Anda sedang melakukan uji pendaftaran seluler secara langsung di browser lokal Anda sekarang juga!
              </p>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
