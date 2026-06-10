import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Registration from './pages/Registration';
import Gallery from './pages/Gallery';
import Announcements from './pages/Announcements';
import Contact from './pages/Contact';
import AdminDashboard from './pages/AdminDashboard';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp, Sparkles, GraduationCap } from 'lucide-react';

// Subcomponent to handle layout transitions & scroll actions 
function AppContent() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const location = useLocation();
  const isFocusRoute = location.pathname === '/spmb' || location.pathname === '/formulir' || location.pathname.startsWith('/admin');

  // Scroll metrics
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        setScrollProgress((window.scrollY / totalScroll) * 100);
      }
      setShowBackToTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Quick initial elegant load mock purely for premium aesthetics
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFirstLoad(false);
    }, 750);
    return () => clearTimeout(timer);
  }, []);

  // Scroll to top on navigation route adjustments & track analytics
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const startTime = Date.now();

    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: location.pathname })
    }).catch(err => console.debug('Analytics track issue:', err));

    // Page session duration tracking on unmount
    return () => {
      const duration = Math.round((Date.now() - startTime) / 1000);
      if (duration > 0 && duration < 7200) {
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: location.pathname, duration })
        }).catch(() => {});
      }
    };
  }, [location.pathname]);

  const scrollToTopAction = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f6f8fc] text-slate-900 font-sans select-none relative overflow-x-hidden">
      
      {/* Premium Minimalist Animated Mounting Display */}
      <AnimatePresence mode="wait">
        {isFirstLoad && (
          <motion.div
            key="preloader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="fixed inset-0 z-[100] bg-gradient-to-br from-blue-900 to-indigo-900 flex flex-col items-center justify-center text-white"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="text-center space-y-4"
            >
              <div className="h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-blue-500/20 animate-pulse">
                <GraduationCap className="h-9 w-9 text-white" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-extrabold tracking-widest uppercase">SDN CIBOJONG 1</h2>
                <p className="text-[10px] text-blue-400 font-mono tracking-widest uppercase font-semibold">Membina Karsa, Menggapai Asa</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Thin Scroll Progress Indicator */}
      <div 
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-amber-500 z-[60] transition-transform duration-75 origin-left"
        style={{ transform: `scaleX(${scrollProgress / 100})` }}
      />

      {/* 2. Navigation Layer */}
      {!isFocusRoute && <Navbar />}

      {/* Spacer to push content down as Navbar holds TopBar (exactly 120px on desktop, 108px on tablet, stacked nicely on mobile) */}
      {!isFocusRoute && <div className="h-[155px] md:h-[108px] lg:h-[120px] shrink-0 w-full" />}

      {/* 3. Main Content Pages Routing */}
      <main className="flex-grow relative z-10">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profil" element={<Profile />} />
          <Route path="/spmb" element={<Registration />} />
          <Route path="/formulir" element={<Registration />} />
          <Route path="/galeri" element={<Gallery />} />
          <Route path="/pengumuman" element={<Announcements />} />
          <Route path="/kontak" element={<Contact />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/login" element={<AdminDashboard />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>

      {/* Interactive Floater Help Desk */}
      {!isFocusRoute && <WhatsAppButton />}

      {/* 4. Elegant Back To Top Button */}
      <AnimatePresence>
        {!isFocusRoute && showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.82, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.82, y: 15 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            onClick={scrollToTopAction}
            className="fixed bottom-6 left-6 z-40 h-11 w-11 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg flex items-center justify-center cursor-pointer hover:scale-105 transition-all outline-none focus:ring-2 focus:ring-blue-450 border border-blue-500/10"
            title="Kembali ke Atas"
            type="button"
          >
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Informative Footer */}
      {!isFocusRoute && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
