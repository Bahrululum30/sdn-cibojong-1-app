import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, LazyMotion, domAnimation } from 'motion/react';
import { 
  Landmark, 
  Compass, 
  Award, 
  Users, 
  BookOpen, 
  ShieldCheck, 
  CheckCircle, 
  GraduationCap,
  X,
  User,
  Sparkles,
  Heart,
  Briefcase,
  ExternalLink,
  Info
} from 'lucide-react';

export default function Profile() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Semua' | 'Guru' | 'Staf'>('Semua');
  const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null);
  const [profileCover, setProfileCover] = useState<string>('https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=800&auto=format&fit=crop');
  const [isMobile, setIsMobile] = useState(false);

  const facilities = [
    { name: "8 Ruang Kelas Kondusif", desc: "Ruangan belajar dengan ventilasi udara sejuk alami dan paparan sinar matahari ideal lengkap dengan meja kursi kayu kokoh.", icon: "🏫" },
    { name: "Laboratorium Komputer", desc: "Perangkat komputer modern lengkap dengan akses internet filter edukasi sehat untuk dasar pemahaman informatika anak.", icon: "💻" },
    { name: "Perpustakaan 'Taman Membaca'", desc: "Koleksi ribuan buku pelajaran, buku fiksi anak, majalah pengetahuan umum, dan area duduk santai karpet empuk.", icon: "📚" },
    { name: "Lapangan Olahraga Serbaguna", desc: "Area bermain luas untuk olahraga futsal, bola voli, senam bersama, pencak silat, dan kegiatan upacara bendera mingguan.", icon: "⚽" },
    { name: "Kebun Edukasi Botani", desc: "Area pekarangan asri tempat siswa belajar budidaya tanaman hias, tanaman obat keluarga (TOGA), dan dasar ekologi bumi.", icon: "🌱" },
    { name: "Musala 'Ar-Rahman'", desc: "Fasilitas sarana ibadah bersih, nyaman, aman untuk memfasilitasi salat Duha harian, salat Zuhur berjamaah, dan kegiatan keagamaan.", icon: "🕌" }
  ];

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });

    fetch('/api/teachers')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTeachers(data.teachers);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error fetching teachers info on profile page:', err);
        setIsLoading(false);
      });

    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.settings && data.settings.profileCoverUrl) {
          setProfileCover(data.settings.profileCoverUrl);
        }
      })
      .catch(err => console.error('Error fetching settings cover on profile page:', err));

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const getFallbackPhoto = (name: string, role: string) => {
    if (role === 'Kepala Sekolah') {
      return 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=300'; // female principal
    }
    if (role === 'TAS/OPS' || name.includes('Yanto') || name.includes('Deden') || name.includes('Shofan')) {
      return 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=300'; // male professional
    }
    return 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=300'; // female teacher
  };

  const getRolePriority = (roleStr: string, categoryStr: string) => {
    const role = (roleStr || '').toLowerCase();
    const category = (categoryStr || '').toLowerCase();
    if (role.includes('kepala sekolah')) return 1;
    if (category === 'guru') return 2;
    if (role.toLowerCase() === 'tas/ops' || role.includes('ops') || role.includes('operator')) return 3;
    if (role.includes('penjaga')) return 4;
    return 5;
  };

  const sortedTeachers = [...teachers].sort((a, b) => {
    const pA = getRolePriority(a.role, a.category);
    const pB = getRolePriority(b.role, b.category);
    if (pA !== pB) return pA - pB;
    return a.id.localeCompare(b.id);
  });

  return (
    <div id="profile-page" className="pt-24 min-h-screen bg-slate-50 text-slate-900">
      
      {/* 1. Profile Title Header Banner */}
      <section className="relative text-white py-16 sm:py-20 px-4 overflow-hidden bg-slate-900">
        <img 
          src={profileCover} 
          alt="Sampul Halaman Profil Sekolah" 
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none opacity-25 z-0"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-slate-900/80 to-indigo-950/90 z-0" />
        <div className="max-w-7xl mx-auto text-center space-y-3 relative z-10">
          <span className="text-xs font-mono font-semibold text-blue-300 bg-blue-500/20 px-3 py-1 rounded-full uppercase tracking-wider inline-block">
            LEMBAGA INSTITUSI RESMI
          </span>
          <h1 className="text-3.5xl sm:text-5xl font-extrabold tracking-tight">Profil SDN Cibojong 1</h1>
          <p className="text-sm sm:text-base text-blue-100 max-w-2xl mx-auto">
            Mengenal lebih dekat visi, sejarah pendirian, sarana penunjang belajar mengajar, serta segenap pengajar berdedikasi tinggi kami.
          </p>
        </div>
      </section>

      {/* 2. Sejarah Singkat (Short History) */}
      <section className="py-16 bg-white border-b border-slate-100">
        <div className="max-w-7xl xl:max-w-[1500px] mx-auto px-6 lg:px-10 xl:px-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-5 relative">
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-xl">
              <img
                src={profileCover}
                alt="Siswa SDN Cibojong 1 Belajar"
                referrerPolicy="no-referrer"
                className="w-full h-80 object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="absolute -bottom-5 -right-5 bg-blue-600 text-white rounded-2xl p-4 shadow-lg hidden md:block border border-blue-400">
              <span className="text-xs font-mono text-blue-200 block">Didirikan Sejak</span>
              <span className="text-2xl font-bold font-mono">1910 Tahun</span>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-5">
            <h2 className="text-2.5xl sm:text-3.5xl font-bold text-slate-800 tracking-tight">
              Sejarah & Identitas Sekolah
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              SDN Cibojong 1 didirikan secara resmi pada tahun 1910 untuk memfasilitasi kebutuhan akses kepemilikan pendidikan dasar bermutu bagi masyarakat sekitar wilayah Desa Cibojong, Padarincang, Kabupaten Serang. Mengusung prinsip keadilan akses ilmu pengetahuan bagi semua child.
            </p>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Selama puluhan tahun melayani masyarakat, SDN Cibojong 1 sukses meluluskan ribuan alumni yang kini berkiprah di berbagai sektor pembangunan regional maupun nasional. Dilengkapi pendidik berpengalaman, kurikulum merdeka harian diselaraskan dengan keagamaan guna memperkokoh sendi-sendi peradaban karakter mulia.
            </p>
            
            {/* Identity Ledger */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                <span className="font-bold text-slate-800 block">NPSN Resmi</span>
                20606062 (Kementerian Pendidikan RI)
              </div>
              <div className="text-xs text-slate-500">
                <span className="font-bold text-slate-800 block">Status Akreditasi</span>
                Terakreditasi B (Baik - BAN-SM)
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. Dewan Guru & Tenaga Kependidikan */}
      <section className="py-20 bg-slate-50/70 border-t border-b border-slate-200/40 relative overflow-hidden">
        {/* Subtle Ambient Background Glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
          <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] animate-[pulse_8s_infinite]" />
          <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] animate-[pulse_10s_infinite_1s]" />
          <div className="absolute top-1/2 left-1/3 w-60 h-60 bg-emerald-500/5 rounded-full blur-[90px] animate-[pulse_12s_infinite]" />
        </div>

        {/* Floating subtle ambient particles */}
        {!isMobile && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
            <motion.div 
              animate={{ y: [-12, 12, -12], x: [0, 8, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[8%] left-[12%] w-2 h-2 rounded-full bg-blue-400/20 blur-[0.5px]" 
            />
            <motion.div 
              animate={{ y: [10, -10, 10], x: [0, -6, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
              className="absolute top-[35%] right-[10%] w-3 h-3 rounded-full bg-indigo-400/15 blur-[0.5px]" 
            />
            <motion.div 
              animate={{ y: [-15, 15, -15], x: [0, 10, 0] }}
              transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
              className="absolute bottom-[25%] left-[6%] w-2.5 h-2.5 rounded-full bg-emerald-400/15 blur-[0.5px]" 
            />
          </div>
        )}

        <div className="max-w-7xl xl:max-w-[1500px] mx-auto px-6 lg:px-10 xl:px-16 relative z-10 font-sans">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <span className="text-xs font-bold text-blue-600 bg-blue-100/70 px-3 py-1 rounded-full uppercase tracking-wider inline-block">
              INTEGRITAS & PROFESIONALISME
            </span>
            <h2 className="text-3.5xl sm:text-4.5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Profil Dewan Guru & Staf
            </h2>
            <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 w-32 mx-auto rounded-full"></div>
            <p className="text-sm text-slate-700 max-w-lg mx-auto pt-1 leading-relaxed font-semibold">
              Bertemu dengan para pendidik profesional dan staf pendukung berdedikasi tinggi yang berkomitmen memandu kemajuan SDN Cibojong 1.
            </p>
          </div>

          <LazyMotion features={domAnimation}>
            {/* Section: Kepala Sekolah (Premium Centered Spotlight Card) */}
            {!isLoading && (
              (() => {
                const kepsekMember = sortedTeachers.find(member => member.role.toLowerCase().includes('kepala sekolah'));
                if (!kepsekMember) return null;
                
                return (
                  <div className="mb-14 flex flex-col items-center">
                    <motion.div
                      initial={{ 
                        opacity: 0, 
                        y: isMobile ? 15 : 20 
                      }}
                      whileInView={{ 
                        opacity: 1, 
                        y: 0 
                      }}
                      viewport={{ once: true, amount: 0.15 }}
                      transition={{
                        duration: isMobile ? 0.35 : 0.45,
                        ease: [0.22, 1, 0.36, 1]
                      }}
                      whileHover={{
                        y: isMobile ? -1 : -3
                      }}
                      onClick={() => setSelectedTeacher(kepsekMember)}
                      className="relative w-full max-w-2xl rounded-[2.5rem] bg-white p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 sm:gap-8 cursor-pointer select-none border border-amber-500/30 group overflow-hidden will-change-transform transform-gpu backface-hidden shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] animate-fade-in"
                    >
                      {/* Left/Upper Profile Image with Gold Glow */}
                      <div className="relative w-36 sm:w-44 aspect-[3/4] shrink-0 rounded-2xl overflow-hidden border border-amber-500/30 shadow-md group-hover:border-amber-400/80 transition-colors duration-300 bg-slate-100 flex-none select-none pointer-events-none">
                        <img
                          src={kepsekMember.photoUrl || getFallbackPhoto(kepsekMember.name, kepsekMember.role)}
                          alt={kepsekMember.name}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                        />
                      </div>

                      {/* Right Info Section */}
                      <div className="flex-1 text-center md:text-left space-y-4">
                        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-white text-[10px] sm:text-xs font-extrabold uppercase tracking-widest shadow-md shadow-amber-500/25">
                          <Award className="h-3.5 w-3.5 animate-pulse text-amber-100" />
                          <span>KEPALA SEKOLAH</span>
                        </div>

                        <div className="space-y-1">
                          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
                            {kepsekMember.name}
                          </h3>
                          <p className="text-xs sm:text-sm font-bold text-amber-800 flex items-center justify-center md:justify-start gap-1 font-sans">
                            <GraduationCap className="h-4.5 w-4.5 text-amber-500 shrink-0" />
                            <span>Pendidik Utama & Pembina Karsa</span>
                          </p>
                        </div>

                        <p className="text-slate-700 text-xs sm:text-sm leading-relaxed italic max-w-md font-medium">
                          "Memimpin dengan keteladanan, mendampingi dengan hati, demi membina generasi muda yang cerdas, bertaqwa, dan berakhlak mulia di SDN Cibojong 1."
                        </p>

                        <div className="pt-2 flex items-center justify-center md:justify-start gap-1.5 text-xs font-extrabold text-amber-800 font-mono tracking-wider uppercase group-hover:translate-x-1.5 transition-transform duration-300">
                          <span>Lihat Visi & Komitmen</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </motion.div>
                  </div>
                );
              })()
            )}

            {/* Separator / Title for Staff Directory */}
            <div className="text-center mb-10">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-widest font-mono">
                DIREKTORI DEWAN PENDIDIK & STAF OPERASIONAL
              </span>
            </div>

            {/* Categorized Filter Tabs with Layout Animation */}
            <div className="flex items-center justify-center gap-1 sm:gap-2 mb-12 max-w-md mx-auto bg-slate-300/60 p-1.5 rounded-full backdrop-blur-md border border-slate-300/40 shadow-sm">
              {(['Semua', 'Guru', 'Staf'] as const).map((tab) => {
                const tabLabel = tab === 'Semua' ? 'Semua Staf' : tab === 'Guru' ? 'Dewan Pengajar' : 'Staf & Operasional';
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className="relative flex-1 text-center py-2.5 px-3 sm:px-4 rounded-full text-xs font-extrabold transition-all duration-300 select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTeacherTabBubble"
                        className="absolute inset-0 bg-blue-700 rounded-full shadow-[0_4px_12px_rgba(59,130,246,0.15)]"
                        transition={{ 
                          type: "spring", 
                          stiffness: 350, 
                          damping: 28,
                          mass: 0.7 
                        }}
                        style={{ zIndex: 0 }}
                      />
                    )}
                    <span className={`relative z-10 block transition-colors duration-250 font-bold truncate ${isActive ? 'text-white' : 'text-slate-800 hover:text-slate-900 '}`}>
                      {tabLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Content Area (Skeleton Loading or Real Directory Grid) */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-7">
                {[...Array(8)].map((_, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0.3 }}
                    animate={{ opacity: [0.35, 0.65, 0.35] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.12 }}
                    className="bg-white/60 rounded-3xl p-5 border border-slate-200/50 h-full flex flex-col items-center text-center relative overflow-hidden"
                  >
                    <div className="w-full aspect-[3/4] bg-slate-200/80 rounded-2xl mb-4" />
                    <div className="h-5 bg-slate-200/80 rounded-md w-3/4 mb-3" />
                    <div className="h-4 bg-slate-200/80 rounded-full w-1/2 mb-2" />
                    <div className="h-3 bg-slate-200/80 rounded-md w-1/3 mt-2" />
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div 
                layout 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-7"
              >
                <AnimatePresence mode="popLayout">
                  {sortedTeachers
                    .filter((member) => {
                      // Filter out Kepsek from regular grid to avoid duplicate listing
                      if (member.role.toLowerCase().includes('kepala sekolah')) return false;

                      if (activeTab === 'Semua') return true;
                      const isTeacher = member.category.toLowerCase() === 'guru' || member.role.toLowerCase().includes('guru') || member.role.toLowerCase().includes('pengajar');
                      if (activeTab === 'Guru') return isTeacher;
                      return !isTeacher;
                    })
                    .map((member, index) => {
                      const isGuru = member.category.toLowerCase() === 'guru';
                      const isOps = member.role.toLowerCase().includes('ops') || member.role.toLowerCase().includes('operator') || member.role.toLowerCase().includes('tas');
                      const isPenjaga = member.role.toLowerCase().includes('penjaga');

                      let badgeText = member.role;
                      let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200   ";
                      
                      if (isGuru) {
                        badgeText = "Pengajar / Guru";
                        badgeStyle = "bg-emerald-50 text-emerald-800 border-emerald-100   ";
                      } else if (isOps) {
                        badgeText = "Operator (TAS/OPS)";
                        badgeStyle = "bg-sky-50 text-sky-850 border-sky-100   ";
                      } else if (isPenjaga) {
                        badgeText = "Penjaga Sekolah";
                        badgeStyle = "bg-orange-50 text-orange-850 border-orange-100   ";
                      }

                      return (
                        <motion.div
                          layout="position"
                          key={member.id}
                          initial={{ 
                            opacity: 0, 
                            scale: isMobile ? 0.98 : 0.96, 
                            y: isMobile ? 15 : 30,
                            filter: isMobile ? "none" : "blur(8px)"
                          }}
                          whileInView={{ 
                            opacity: 1, 
                            scale: 1, 
                            y: 0,
                            filter: "blur(0px)"
                          }}
                          viewport={{ once: true, amount: 0.15 }}
                          exit={{ 
                            opacity: 0, 
                            scale: isMobile ? 0.98 : 0.95, 
                            y: 10,
                            transition: { duration: 0.25 }
                          }}
                          transition={{ 
                            duration: isMobile ? 0.45 : 0.8, 
                            ease: [0.22, 1, 0.36, 1],
                            delay: isMobile ? 0 : Math.min((index % 4) * 0.05, 0.25)
                          }}
                          whileHover={isMobile ? { y: -2, scale: 1.01 } : { 
                            y: -6,
                            scale: 1.025,
                            boxShadow: "0 10px 40px rgba(59,130,246,0.08)"
                          }}
                          whileTap={{ scale: 0.985 }}
                          onClick={() => setSelectedTeacher(member)}
                          className="bg-white rounded-3xl p-5 border border-slate-200 h-full flex flex-col items-center text-center cursor-pointer relative group overflow-hidden transition-all duration-350 shadow shadow-slate-100 hover:shadow-lg hover:border-blue-500 select-none will-change-transform transform-gpu backface-hidden"
                          style={{ contentVisibility: "auto", containIntrinsicSize: "0 380px" }}
                        >
                          {/* Shimmer sweep effect overlay on hover */}
                          <div className="absolute top-0 -inset-full h-full w-[40%] z-[5] block transform -skew-x-[25deg] bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-[1200ms] group-hover:translate-x-[400%] pointer-events-none" />

                          {/* Portrait 3x4 layout image container */}
                          <div className="relative aspect-[3/4] w-full max-w-[200px] shrink-0 rounded-2xl overflow-hidden border border-slate-200 shadow-sm mb-4 bg-slate-100 pointer-events-none select-none">
                            <img
                              src={member.photoUrl || getFallbackPhoto(member.name, member.role)}
                              alt={member.name}
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover transition-transform duration-[0.8s] ease-out group-hover:scale-105"
                            />
                          </div>

                          {/* Name and Educational Icon */}
                          <div className="flex-1 flex flex-col justify-between space-y-3.5 w-full">
                            <div className="space-y-1.5 truncate-text-container">
                              <h4 className="font-extrabold text-slate-900 text-base md:text-[17px] leading-snug group-hover:text-blue-600 transition-colors line-clamp-2 min-h-[2.75rem] flex items-center justify-center">
                                {member.name}
                              </h4>
                              
                              {/* Academic detail badge under the name */}
                              <div className="flex items-center justify-center gap-1.5 text-slate-700 font-bold font-sans">
                                <GraduationCap className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                                <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-mono font-extrabold">STAF AKADEMIK</span>
                              </div>
                            </div>

                            <div className="space-y-3 w-full">
                              <span className={`px-2.5 py-1.5 rounded-full border text-[10px] font-extrabold leading-none inline-block w-full text-center truncate ${badgeStyle}`}>
                                {badgeText}
                              </span>

                              <div className="flex items-center justify-center gap-1 text-[11px] font-extrabold text-blue-600 font-mono opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider duration-300">
                                <span>Detail Profil</span>
                                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ======================================================== */}
            {/* INTERACTIVE TEACHER PROFILE MODAL (Cool pop-up on click) */}
            {/* ======================================================== */}
            <AnimatePresence>
              {selectedTeacher && (() => {
                const member = selectedTeacher;
                const isKepsek = member.role.toLowerCase().includes('kepala sekolah');
                const isGuru = member.category.toLowerCase() === 'guru';
                const isOps = member.role.toLowerCase().includes('ops') || member.role.toLowerCase().includes('operator') || member.role.toLowerCase().includes('tas');
                const isPenjaga = member.role.toLowerCase().includes('penjaga');

                // Dynamic Motto commitment
                let mottoCommitment = "Mengabdi dengan sepenuh hati demi kemajuan pendidikan anak-anak di SDN Cibojong 1 Padarincang.";
                if (isKepsek) {
                  mottoCommitment = "Memimpin dengan keteladanan, mendampingi dengan hati, demi membina tunas bangsa yang cerdas dan berkarakter mulia di SDN Cibojong 1.";
                } else if (isGuru) {
                  mottoCommitment = "Mendidik dengan kesabaran and cinta, membimbing setiap siswa menemukan potensi terbaiknya menuju masa depan gemilang.";
                } else if (isOps) {
                  mottoCommitment = "Mendukung digitalisasi sistem pendidikan harian dan keamanan pelayanan administrasi terpadu.";
                } else if (isPenjaga) {
                  mottoCommitment = "Berdedikasi menjaga ketertiban, kebersihan, dan kenyamanan lingkungan belajar anak-anak didik tercinta.";
                }

                // Dynamic Specialization Focus
                let focusField = "Pengembangan Mutu Akademik & Merdeka Belajar";
                if (isKepsek) focusField = "Kebijakan Sekolah, Kepemimpinan Strategis & Hubungan Masyarakat";
                else if (member.role.toLowerCase().includes('kelas 1') || member.role.toLowerCase().includes('kelas i')) focusField = "Pembiasaan Budi Pekerti, Transisi PAUD-SD & Calistung Dasar";
                else if (member.role.toLowerCase().includes('kelas 2') || member.role.toLowerCase().includes('kelas ii')) focusField = "Penguatan Literasi-Numerasi Dasar & Pembinaan Karsa";
                else if (member.role.toLowerCase().includes('kelas 3') || member.role.toLowerCase().includes('kelas iii')) focusField = "Sosialisasi Siswa, Pembelajaran Tematik & Kerja Mandiri";
                else if (member.role.toLowerCase().includes('kelas 4') || member.role.toLowerCase().includes('kelas iv')) focusField = "Pembinaan Logika Kritis, Sains Terpadu & Proyek Karakter";
                else if (member.role.toLowerCase().includes('text-5') || member.role.toLowerCase().includes('kelas v')) focusField = "Inovasi Matematika Lanjut, Pendalaman IPAS & Kreasi Seni";
                else if (member.role.toLowerCase().includes('kelas 6') || member.role.toLowerCase().includes('kelas vi')) focusField = "Pendampingan Ujian Akhir, Transisi SMP & Pembentukan Kedewasaan";
                else if (member.role.toLowerCase().includes('olahraga') || member.role.toLowerCase().includes('pjok')) focusField = "Pemberdayaan Motorik, Latihan Ketangkasan Fisik & Sportivitas Tim";
                else if (member.role.toLowerCase().includes('agama')) focusField = "Bimbingan Rohani, Karakter Akhlakul Karimah & Pembiasaan Salat";
                else if (isOps) focusField = "Tata Kelola Manajemen Dapodik, Aplikasi SPMB & Data Teknis Terintegrasi";
                else if (isPenjaga) focusField = "Keamanan Kompleks Kampus, Penataan Lingkungan Hijau & Higienitas Prasarana";

                return (
                  <div 
                    id="teacher-profile-modal" 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden"
                  >
                    {/* Backdrop with elegant blur */}
                    <motion.div
                      initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                      animate={{ opacity: 1, backdropFilter: isMobile ? "blur(4px)" : "blur(12px)" }}
                      exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      onClick={() => setSelectedTeacher(null)}
                      className="absolute inset-0 bg-slate-950/70"
                    />

                    {/* Modal Container Card */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96, y: 20 }}
                      animate={{ 
                        opacity: 1, 
                        scale: 1, 
                        y: 0,
                      }}
                      exit={{ 
                        opacity: 0, 
                        scale: 0.96, 
                        y: 15,
                      }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="bg-white rounded-3xl shadow-2xl border border-slate-150 max-w-lg w-full overflow-hidden relative z-10 mx-auto"
                    >
                      {/* Decorative color border top */}
                      <div className={`h-2.5 w-full bg-gradient-to-r ${isKepsek ? 'from-amber-400 to-amber-600' : 'from-blue-500 to-indigo-600'}`} />

                      {/* Close button with high-contrast indicator */}
                      <button
                        onClick={() => setSelectedTeacher(null)}
                        className="absolute top-5 right-5 h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-850 flex items-center justify-center transition-colors cursor-pointer focus:outline-none"
                        title="Tutup detail"
                      >
                        <X className="h-4.5 w-4.5" />
                      </button>

                      <div className="p-6 sm:p-8 space-y-6">
                        {/* Upper Profile presentation */}
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                          {/* Exact 3x4 Portrait image frame inside modal */}
                          <div className="relative w-32 aspect-[3/4] sm:w-36 rounded-2xl overflow-hidden border border-slate-100 shadow-md shrink-0 bg-slate-50">
                            <img
                              src={member.photoUrl || getFallbackPhoto(member.name, member.role)}
                              alt={member.name}
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div className="text-center sm:text-left space-y-2.5 pt-1.5 min-w-0">
                            <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-mono leading-none tracking-wider uppercase inline-block font-bold ${ isKepsek ? 'bg-amber-100 text-amber-800 border-amber-200 ' : isGuru ? 'bg-emerald-100 text-emerald-800 border-emerald-200 ' : isOps ? 'bg-sky-100 text-sky-800 border-sky-200 ' : 'bg-orange-100 text-orange-850 border-orange-200 ' }`}>
                              {member.role}
                            </span>
                            
                            <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl leading-snug truncate">
                              {member.name}
                            </h3>

                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 block pt-1.5 text-left text-xs">
                              <div>
                                <span className="text-slate-600 block font-bold uppercase text-[9px] tracking-wider">Lembaga</span>
                                <span className="text-slate-900 font-extrabold font-sans">SDN Cibojong 1</span>
                              </div>
                              <div>
                                <span className="text-slate-600 block font-bold uppercase text-[9px] tracking-wider font-mono">NPSN</span>
                                <span className="text-slate-900 font-mono font-extrabold">20606062</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Educational Commitment Description quote block */}
                        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm relative">
                          <div className="absolute top-3 left-3 text-3xl text-slate-300/80 select-none font-serif leading-none">“</div>
                          <p className="text-sm md:text-base text-gray-900 italic leading-relaxed pl-4 relative z-10 font-medium">
                            {mottoCommitment}
                          </p>
                        </div>

                        {/* Meta specifics lists */}
                        <div className="space-y-4 pt-1 text-sm md:text-base">
                          <div className="flex items-start gap-3">
                            <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                              <Sparkles className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                              <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-widest font-mono">Fokus Utama Pelayanan</span>
                              <span className="text-slate-700 font-sans font-medium leading-relaxed block text-sm md:text-base">{focusField}</span>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                              <CheckCircle className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                              <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-widest font-mono">Status Keanggotaan</span>
                              <span className="text-slate-700 font-sans font-medium leading-relaxed block text-sm md:text-base">Terverifikasi Aktif di Sistem Dapodik Kemendikbudristek RI</span>
                            </div>
                          </div>
                        </div>

                        {/* Closing button */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setSelectedTeacher(null)}
                            className={`w-full py-3 px-5 rounded-2xl text-sm font-bold text-white transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] ${ isKepsek ? 'bg-amber-600 shadow-md shadow-amber-500/20' : 'bg-slate-900 shadow-md shadow-slate-900/10 ' }`}
                          >
                            <ShieldCheck className="h-4 w-4" />
                            <span>Selesai & Tutup</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                );
              })()}
            </AnimatePresence>
          </LazyMotion>
        </div>
      </section>

      {/* 4. Sarana dan Prasarana Details */}
      <section className="py-16 bg-white border-t border-slate-100">
        <div className="max-w-7xl xl:max-w-[1500px] mx-auto px-6 lg:px-10 xl:px-16">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">AKSES PENUNJANG</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 tracking-tight">Eksplorasi Sarana & Prasarana</h2>
            <div className="h-1 bg-blue-600 w-20 mx-auto rounded"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {facilities.map((fac, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200/60 p-6 rounded-2xl flex flex-col justify-between hover:shadow-md hover:border-blue-400/50 transition-all">
                <div>
                  <div className="text-4xl mb-4 select-none">{fac.icon}</div>
                  <h4 className="font-extrabold text-slate-900 text-base mb-2">{fac.name}</h4>
                  <p className="text-xs text-slate-650 leading-relaxed font-semibold">{fac.desc}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                  <span>SDN CIBOJONG 1</span>
                  <span className="text-emerald-650 font-extrabold">TERSEDIA</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
