import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Menu, 
  X, 
  GraduationCap, 
  ShieldCheck, 
  Clock, 
  Calendar, 
  CloudSun, 
  Sparkles,
  CircleDot
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import schoolLogo from '../assets/school_logo.png';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [logo, setLogo] = useState(schoolLogo);
  const location = useLocation();

  // Clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real weather indicator mock
  const weatherTemp = "29°C Gerimis Berawan";

  useEffect(() => {
    // Force Light Mode on Document Root
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
    localStorage.setItem('theme', 'light');

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Real-time time interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch logo from settings
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.settings && data.settings.logoUrl) {
          setLogo(data.settings.logoUrl);
        }
      })
      .catch(err => console.error('Error loading dynamic logo in Navbar:', err));
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  // Nav routing logic
  const navLinks = [
    { name: 'Beranda', path: '/' },
    { name: 'Profil Sekolah', path: '/profil' },
    { name: 'SPMB 2026/2027', path: '/formulir' },
    { name: 'Galeri Kegiatan', path: '/galeri' },
    { name: 'Pengumuman', path: '/pengumuman' },
    { name: 'Kontak', path: '/kontak' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path;
  };

  // Helper formatting Indonesian Day and Date
  const getIndonesianDateString = (date: Date) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    
    const dayName = days[date.getDay()];
    const dateNum = date.getDate();
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${dayName}, ${dateNum} ${monthName} ${year}`;
  };

  const getIndonesianTimeString = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds} WIB`;
  };

  // Helper for actual school calendar operational status
  const getSchoolStatus = (date: Date) => {
    const day = date.getDay(); // 0 is Sunday, 6 is Saturday
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const decimalTime = hours + minutes / 60;

    if (day === 0) {
      return { text: "SEKOLAH TUTUP (LIBUR MINGGU)", color: "text-rose-600", bg: "bg-rose-50 border-rose-100" };
    }
    if (day === 6) {
      return { text: "OPERASIONAL TUTUP (SABTU)", color: "text-amber-600", bg: "bg-amber-50 border-amber-100" };
    }

    // Monday to Friday: open 07:15 - 13:00
    if (decimalTime >= 7.25 && decimalTime <= 13.0) {
      return { text: "KEGIATAN BELAJAR AKTIF (BUKA)", color: "text-emerald-600 animate-pulse", bg: "bg-emerald-50 border-emerald-150" };
    }
    
    return { text: "SEKOLAH BUKA (DI LUAR JAM BELAJAR)", color: "text-blue-600", bg: "bg-blue-50 border-blue-150" };
  };

  const status = getSchoolStatus(currentTime);

  return (
    <motion.header
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 flex flex-col w-full select-none"
    >
      
      {/* 1. TOP PREMIUM BAR */}
      <div className="w-full py-2 bg-slate-900 border-b border-slate-800 text-slate-300 bg-linear-to-r from-slate-900 via-slate-950 to-slate-900">
        <div className="max-w-7xl xl:max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between text-[11px] sm:text-xs font-mono tracking-wide gap-2 text-center md:text-left">
            
            {/* Left: Date */}
            <div className="flex items-center justify-center md:justify-start gap-1.5 font-sans font-semibold">
              <Calendar className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              <span>{getIndonesianDateString(currentTime)}</span>
            </div>

            {/* Middle: Live Time Clock Widget */}
            <div className="flex items-center justify-center gap-2 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700/50 max-w-xs mx-auto md:mx-0 shadow-inner">
              <Clock className="h-3.5 w-3.5 text-blue-400 shrink-0 animate-pulse" />
              <span className="font-bold text-blue-300 font-mono tracking-widest">{getIndonesianTimeString(currentTime)}</span>
            </div>

            {/* Right: Operational School Status & Small Weather Indicator */}
            <div className="flex items-center justify-center md:justify-end gap-3 flex-wrap">
              <div className={`px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold flex items-center gap-1 sm:gap-1.5 ${status.bg}`}>
                <CircleDot className="h-2 w-2 fill-current text-current" />
                <span className={`${status.color}`}>{status.text}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 font-sans font-semibold">
                <CloudSun className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>{weatherTemp}</span>
              </div>
            </div>

          </div>
        </div>
      </div>      {/* 2. MAIN SOLID PREMIUM NAVBAR */}
      <div 
        className={`w-full border-b transition-all duration-300 ${
          isScrolled 
            ? 'bg-white border-slate-200/85 shadow-md' 
            : 'bg-white/95 backdrop-blur-md border-slate-200/50 shadow-sm'
        }`}
      >
        <nav
          id="main-navbar"
          className="max-w-[1440px] mx-auto h-16 md:h-[72px] lg:h-20 px-4 sm:px-6 lg:px-8 xl:px-10 flex items-center justify-between w-full"
        >
          {/* LEFT: Logo, Identitas, & School Info */}
          <div className="flex items-center lg:w-[220px] xl:w-[290px] shrink-0 justify-start">
            <Link id="nav-brand" to="/" className="flex items-center space-x-3 group">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full overflow-hidden bg-white flex items-center justify-center shadow-sm border border-slate-200 p-0.5 shrink-0 transition-transform duration-300">
                <img
                  src={logo}
                  alt="Logo SDN Cibojong 1"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="text-left">
                <div className="text-xs sm:text-sm font-extrabold tracking-tight text-slate-900 group-hover:text-blue-605 transition-colors uppercase flex items-center gap-1 leading-snug">
                  SDN Cibojong 1
                  <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse shrink-0 hidden sm:inline" />
                </div>
                <div className="text-[9px] sm:text-[10px] font-bold text-slate-500 tracking-wider leading-none">
                  Padarincang - Serang
                </div>
              </div>
            </Link>
          </div>

          {/* CENTER: Desktop & Laptop Navigation Links */}
          <div className="hidden lg:flex items-center justify-center flex-1 mx-2 gap-1 xl:gap-2.5 max-w-4xl">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  id={`nav-link-${link.name.toLowerCase().replace(/\s+/g, '-')}`}
                  to={link.path}
                  className={`relative px-2 xl:px-3.5 py-2 rounded-full text-[11px] xl:text-xs font-bold transition-all duration-150 uppercase tracking-wider whitespace-nowrap ${
                    active 
                      ? 'text-blue-600 bg-blue-50 border border-blue-500/10 font-extrabold shadow-2xs' 
                      : 'text-slate-700 hover:bg-slate-50 hover:text-blue-605'
                  }`}
                >
                  <span className="relative z-10">{link.name}</span>
                </Link>
              );
            })}
          </div>

          {/* RIGHT: Actions */}
          <div className="flex items-center lg:w-[220px] xl:w-[290px] shrink-0 justify-end space-x-2 sm:space-x-3">
            {/* Portal Admin Button (Desktop Only) */}
            <Link
              id="nav-link-admin"
              to="/admin"
              className="hidden lg:flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-200 shadow-sm"
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Portal Admin</span>
            </Link>

            {/* Portal Admin Shortcut (Mobile & Tablet) */}
            <Link
              to="/admin"
              className="p-2 rounded-full text-blue-700 bg-blue-50 border border-blue-100 lg:hidden shadow-2xs"
              title="Portal Admin"
            >
              <ShieldCheck className="h-4 w-4" />
            </Link>

            {/* Hamburger Menu Toggle (Mobile & Tablet) */}
            <button
              id="mobile-menu-btn"
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-full text-slate-700 hover:text-blue-600 hover:bg-slate-50 focus:outline-none transition-all cursor-pointer lg:hidden"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile Navigation Drawer & Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Dark Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-55 lg:hidden"
            />

            {/* Right Sliding Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed top-0 right-0 bottom-0 w-[300px] max-w-[85vw] bg-white z-60 shadow-2xl h-full flex flex-col lg:hidden border-l border-slate-205"
            >
              {/* Drawer Header */}
              <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono">MENU NAVIGASI</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-full text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation Links inside Drawer */}
              <div className="flex-grow overflow-y-auto py-5 px-4 space-y-1.5">
                {navLinks.map((link) => {
                  const active = isActive(link.path);
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                        active 
                          ? 'bg-blue-600 text-white shadow-sm font-extrabold' 
                          : 'text-slate-700 hover:bg-slate-50 hover:text-blue-600 font-bold'
                      }`}
                    >
                      <span>{link.name}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Drawer Footer Admin Link */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
                <Link
                  to="/admin"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center space-x-2 w-full py-3 rounded-xl bg-blue-50 text-blue-800 border border-blue-100 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all font-extrabold text-xs uppercase tracking-wider"
                >
                  <ShieldCheck className="h-4.5 w-4.5" />
                  <span>Portal Admin</span>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
