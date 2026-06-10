import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Landmark, GraduationCap, Instagram } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="app-footer" className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Column 1: School Identity */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <span className="font-bold text-lg text-white block">SDN CIBOJONG 1</span>
                <span className="text-xs font-mono text-slate-400 tracking-wider">Padarincang, Serang</span>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              Membentuk generasi unggul yang cerdas, berkarakter luhur, mandiri, berlandaskan iman dan takwa sejak dini di wilayah Padarincang, Serang, Banten.
            </p>
            
            {/* Social Media Links */}
            <div className="pt-2">
              <span className="text-2xs font-mono text-slate-500 uppercase tracking-widest block mb-2">Media Sosial Resmi:</span>
              <div className="flex space-x-2.5">
                <a
                  href="https://www.instagram.com/sdncibojong1_official?igsh=MTRsYmsxZGRndXVvcA%3D%3D&utm_source=qr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 rounded-full bg-slate-800 hover:bg-gradient-to-tr hover:from-yellow-500 hover:via-red-500 hover:to-purple-600 flex items-center justify-center text-white hover:scale-105 transition-all shadow border border-slate-700/60"
                  title="Hubungi lewat Instagram"
                >
                  <Instagram className="h-4 w-4" />
                </a>
                <a
                  href="https://www.tiktok.com/@sdn.cibojong.1?_r=1&_t=ZS-96ckEHkXbDW"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 rounded-full bg-slate-800 hover:bg-gradient-to-tr hover:from-[#FE0946] hover:via-[#010101] hover:to-[#25F4EE] flex items-center justify-center text-white hover:scale-105 transition-all shadow border border-slate-700/60"
                  title="Sapa kami di TikTok"
                >
                  <svg className="h-[18px] w-[18px] group-hover:scale-110 transition-transform duration-300" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Cyan layer shifted left/up */}
                    <path
                      d="M19 10.5V8.5C17.5 8.5 16 7.5 16 6V3H13v11.5c0 1.93-1.57 3.5-3.5 3.5S6 16.43 6 14.5s1.57-3.5 3.5-3.5c.57 0 1.11.14 1.5.38V8.62C10.5 8.24 9.5 8 9.5 8 5.91 8 3 10.91 3 14.5S5.91 21 9.5 21s6.5-2.91 6.5-6.5V10.5c1.5 1 3 1 3 1z"
                      fill="#25F4EE"
                      transform="translate(-0.6, -0.6)"
                    />
                    {/* Red / Neon-Magenta layer shifted right/down */}
                    <path
                      d="M19 10.5V8.5C17.5 8.5 16 7.5 16 6V3H13v11.5c0 1.93-1.57 3.5-3.5 3.5S6 16.43 6 14.5s1.57-3.5 3.5-3.5c.57 0 1.11.14 1.5.38V8.62C10.5 8.24 9.5 8 9.5 8 5.91 8 3 10.91 3 14.5S5.91 21 9.5 21s6.5-2.91 6.5-6.5V10.5c1.5 1 3 1 3 1z"
                      fill="#FE0946"
                      transform="translate(0.6, 0.6)"
                    />
                    {/* White main layer exactly centered */}
                    <path
                      d="M19 10.5V8.5C17.5 8.5 16 7.5 16 6V3H13v11.5c0 1.93-1.57 3.5-3.5 3.5S6 16.43 6 14.5s1.57-3.5 3.5-3.5c.57 0 1.11.14 1.5.38V8.62C10.5 8.24 9.5 8 9.5 8 5.91 8 3 10.91 3 14.5S5.91 21 9.5 21s6.5-2.91 6.5-6.5V10.5c1.5 1 3 1 3 1z"
                      fill="#FFFFFF"
                    />
                  </svg>
                </a>
              </div>
            </div>

            <div className="pt-1 text-2xs text-slate-500">
              NPSN: <span className="font-mono text-slate-300">20606062</span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-white font-semibold text-base mb-4 tracking-wide uppercase">Tautan Penting</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/" className="hover:text-blue-400 transition-colors">Halaman Utama</Link>
              </li>
              <li>
                <Link to="/profil" className="hover:text-blue-400 transition-colors">Profil Sekolah</Link>
              </li>
              <li>
                <Link to="/spmb" className="hover:text-blue-400 transition-colors">SPMB Online 2026/2027</Link>
              </li>
              <li>
                <Link to="/galeri" className="hover:text-blue-400 transition-colors">Galeri Kegiatan</Link>
              </li>
              <li>
                <Link to="/pengumuman" className="hover:text-blue-400 transition-colors">Pengumuman Terkini</Link>
              </li>
              <li>
                <Link to="/kontak" className="hover:text-blue-400 transition-colors">Hubungi Kami</Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact Details */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-base tracking-wide uppercase">Sekretariat</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                <span>Jl. Palka Km. 35, Kadubeureum, Kec. Padarincang, Kabupaten Serang, Banten.</span>
              </li>
              <li className="space-y-1.5">
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-blue-500 shrink-0" />
                  <span className="font-semibold text-xs tracking-wider uppercase text-slate-400">WhatsApp Resmi:</span>
                </div>
                <div className="pl-8 space-y-1">
                  <a href="https://wa.me/6287710206067" target="_blank" rel="noopener noreferrer" className="block text-xs hover:text-blue-400 transition-colors">
                    📱 Izmayati: <span className="font-mono text-slate-300 font-bold hover:underline">+62 877-1020-6067</span>
                  </a>
                  <a href="https://wa.me/6283873508737" target="_blank" rel="noopener noreferrer" className="block text-xs hover:text-blue-400 transition-colors">
                    📱 Nurul Uyun: <span className="font-mono text-slate-300 font-bold hover:underline">+62 838-7350-8737</span>
                  </a>
                </div>
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-blue-500 shrink-0" />
                <a href="mailto:sdn.cibojong1@gmail.com" className="hover:text-blue-400 transition-colors">
                  sdn.cibojong1@gmail.com
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Google Maps integration */}
          <div className="space-y-3">
            <h3 className="text-white font-semibold text-base tracking-wide uppercase">Lokasi Sekolah</h3>
            <div className="rounded-lg overflow-hidden border border-slate-700 h-32 relative">
              <iframe
                title="Google Maps SDN Cibojong 1"
                src="https://maps.google.com/maps?q=SDN%20Cibojong%201%20Kadubeureum%20Padarincang%20Serang&t=&z=16&ie=UTF8&iwloc=&output=embed"
                className="w-full h-full"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
            <a 
              href="https://maps.app.goo.gl/NUhjFS2ZUss9uoD77" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex w-full justify-center items-center gap-1.5 py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-sm text-center"
            >
              <MapPin className="h-3 w-3" />
              <span>Petunjuk Google Maps</span>
            </a>
          </div>

        </div>

        {/* Bottom Banner */}
        <div className="mt-12 pt-8 border-t border-slate-800 text-center text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            © {currentYear} SDN Cibojong 1 Padarincang. Hak Cipta Dilindungi.
          </div>
          <div className="flex space-x-4">
            <Link to="/admin" className="hover:text-slate-400">Portal Admin</Link>
            <span>•</span>
            <span className="font-mono text-slate-600">SPMB v2.6 // 2026/2027</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
