import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import schoolLogo from '../assets/school_logo.png';
import { 
  ArrowRight, 
  CheckCircle, 
  GraduationCap, 
  BookOpen, 
  MapPin, 
  Calendar, 
  FileText, 
  Users, 
  Award, 
  Heart, 
  Compass, 
  Monitor, 
  Smile,
  Activity,
  Sparkles,
  Trophy,
  Check,
  Flag
} from 'lucide-react';

import ProgramCard, { ProgramData } from '../components/ProgramCard';
import QRSection from '../components/QRSection';

// New high quality illustrated program images
import pencakSilatImg from '../assets/images/silat_program_1779712525640.png';
import senamLantaiImg from '../assets/images/gymnastic_program_1779712543229.png';
import futsalImg from '../assets/images/futsal_program_1779712558267.png';
import pramukaImg from '../assets/images/scout_program_1779712579518.png';
import seniTariImg from '../assets/images/dance_program_1779712597941.png';

import upacaraBenderaImg from '../assets/images/flag_ceremony_1779712614568.png';
import senamLiterasiImg from '../assets/images/literacy_program_1779712633044.png';
import tadarusQuranImg from '../assets/images/reading_quran_1779712656326.png';
import salatDhuhaImg from '../assets/images/praying_dhuha_1779712676513.png';

const ALL_PROGRAMS: ProgramData[] = [
  {
    title: 'Pencak Silat',
    description: 'Melatih kedisiplinan, ketangkasan, dan karakter siswa melalui seni bela diri tradisional Indonesia.',
    image: pencakSilatImg,
    icon: Activity,
    category: 'Ekstrakurikuler',
    schedule: 'Jadwal latihan berkala kondisional khusus',
    benefits: [
      'Melatih kedisiplinan, ketangkasan, dan ketahanan fisik tubuh',
      'Membentuk kepribadian tangguh, mandiri, serta berkarakter luhur',
      'Mengembangkan kecintaan mendalam terhadap seni bela diri tradisional Indonesia'
    ],
    equipment: 'Pakaian seragam Pencak Silat lengkap dengan sabuk pengikat',
    coach: 'Deden Jaelani, S.Pd',
    bgColor: 'bg-orange-50',
    accentColor: 'text-orange-600',
    borderColor: 'hover:border-orange-200/80',
    shadowColor: 'hover:shadow-orange-100/30'
  },
  {
    title: 'Senam Lantai',
    description: 'Mengembangkan kelenturan tubuh, keseimbangan, dan kebugaran siswa melalui olahraga senam dasar.',
    image: senamLantaiImg,
    icon: Sparkles,
    category: 'Ekstrakurikuler',
    schedule: 'Jadwal latihan berkala PJOK',
    benefits: [
      'Mengembangkan kelenturan tubuh, kelincahan, dan keseimbangan gerak',
      'Meningkatkan kesehatan jasmani harian serta kebugaran fisik anak',
      'Menumbuhkan rasa percaya diri, antusiasme, serta koordinasi motorik'
    ],
    equipment: 'Pakaian olahraga sekolah resmi (Kaos dan celana training)',
    coach: 'Deden Jaelani, S.Pd',
    bgColor: 'bg-teal-50',
    accentColor: 'text-teal-600',
    borderColor: 'hover:border-teal-200/80',
    shadowColor: 'hover:shadow-teal-100/30'
  },
  {
    title: 'Futsal / Bola',
    description: 'Melatih kerja sama tim, sportivitas, dan keterampilan olahraga siswa.',
    image: futsalImg,
    icon: Trophy,
    category: 'Ekstrakurikuler',
    schedule: 'Latihan terjadwal berkala di lapangan sekolah',
    benefits: [
      'Melatih kerja sama tim, kekompakan taktis, serta sportif berkompetisi',
      'Mengembangkan koordinasi motorik kasar, kelincahan berlari, dan stamina',
      'Menanamkan mentalitas sportivitas berkeadilan dalam berolahraga'
    ],
    equipment: 'Sepasang sepatu olahraga, kaos tim, dan pelindung kaki',
    coach: 'Deden Jaelani, S.Pd',
    bgColor: 'bg-blue-50',
    accentColor: 'text-blue-600',
    borderColor: 'hover:border-blue-200/80',
    shadowColor: 'hover:shadow-blue-100/30'
  },
  {
    title: 'Pramuka',
    description: 'Membentuk karakter mandiri, disiplin, dan jiwa kepemimpinan siswa sejak dini.',
    image: pramukaImg,
    icon: Compass,
    category: 'Ekstrakurikuler',
    schedule: 'Setiap hari Jumat dimulai pukul 13.00 WIB setelah salat Jumat sampai selesai.',
    benefits: [
      'Membentuk pilar kemandirian, kedisiplinan diri, dan jiwa kepemimpinan',
      'Melatih kemandirian kelompok, kepanduan dasar, dan kerja sama tim',
      'Menanamkan nilai-nilai luhur Pancasila dan gotong royong sosial sejak dini'
    ],
    equipment: 'Seragam Pramuka lengkap dengan atribut topi baret, kacu & peluit',
    coach: 'Oleh Yanto, S.Pd',
    bgColor: 'bg-indigo-50',
    accentColor: 'text-indigo-600',
    borderColor: 'hover:border-indigo-200/80',
    shadowColor: 'hover:shadow-indigo-100/30'
  },
  {
    title: 'Seni Tari',
    description: 'Mengembangkan kreativitas dan kecintaan siswa terhadap budaya seni tari tradisional Indonesia.',
    image: seniTariImg,
    icon: Smile,
    category: 'Ekstrakurikuler',
    schedule: 'Latihan berkala kondisional terjadwal khusus',
    benefits: [
      'Melestarikan warisan seni tari budaya daerah tradisional Indonesia',
      'Mengembangkan kreativitas tari, kelenturan tubuh, dan minat seni',
      'Meningkatkan rasa percaya diri siswa saat tampil berekspresi di panggung'
    ],
    equipment: 'Kaos latihan santai & selendang selendang tari (sampur) cerah',
    coach: 'Nur Suryaningsih, S.Pd',
    bgColor: 'bg-pink-50',
    accentColor: 'text-pink-600',
    borderColor: 'hover:border-pink-200/80',
    shadowColor: 'hover:shadow-pink-100/30'
  },
  {
    title: 'Upacara Bendera',
    description: 'Menanamkan rasa cinta tanah air, nasionalisme, kedisiplinan, serta menghormati pahlawan.',
    image: upacaraBenderaImg,
    icon: Flag,
    category: 'Pembiasaan',
    schedule: 'Setiap Hari Senin Pagi, Jam 07:00 - 07:45 WIB',
    benefits: [
      'Memupuk cinta tanah air, nasionalisme, dan rasa bangga bernegara',
      'Melatih kedisiplinan berbaris, kepemimpinan, dan fokus konsentrasi',
      'Menghormati serta mendoakan jasa luhur perjuangan para pahlawan'
    ],
    equipment: 'Seragam merah-putih lengkap beratribut wajib dasi, topi upacara',
    coach: 'Kepala Sekolah & Seluruh Dewan Guru Pendamping',
    bgColor: 'bg-red-50',
    accentColor: 'text-red-550',
    borderColor: 'hover:border-red-200/80',
    shadowColor: 'hover:shadow-red-100/30'
  },
  {
    title: 'Senam dan Literasi',
    description: 'Program pembiasaan untuk meningkatkan kesehatan jasmani dan budaya membaca siswa.',
    image: senamLiterasiImg,
    icon: BookOpen,
    category: 'Pembiasaan',
    schedule: 'Senam: Hari Sabtu pukul 07.00 WIB. Literasi: Hari Kamis pukul 07.00 WIB selama 30 menit.',
    benefits: [
      'Meningkatkan kesehatan fisik, kekuatan sendi lewat senam pagi Sabtu',
      'Membiasakan minat baca buku (Literasi) peneguh wawasan baru Kamis',
      'Menyeimbangkan kesegaran jasmani bugar dengan kesiapan otak kognitif'
    ],
    equipment: 'Pakaian olahraga sekolah resmi & membawa buku bacaan pilihan',
    coach: 'Pembimbing Literasi: Izmayati Hermana, S.Pd & Nurul Uyun, S.Pd. Pembimbing Senam: Seluruh Dewan Guru',
    bgColor: 'bg-emerald-50',
    accentColor: 'text-emerald-600',
    borderColor: 'hover:border-emerald-200/80',
    shadowColor: 'hover:shadow-emerald-100/30'
  },
  {
    title: 'Tadarus Juz Amma',
    description: 'Pembiasaan membaca Al-Qur’an sebelum memulai pembelajaran untuk membangun karakter religius siswa.',
    image: tadarusQuranImg,
    icon: Heart,
    category: 'Pembiasaan',
    schedule: 'Setiap hari Senin sampai Sabtu sebelum pembelajaran dimulai selama 10 menit.',
    benefits: [
      'Membiasakan pembiasaan religius membaca Al-Qur\'an secara rutin harian',
      'Melatih kefasihan melafalkan makhorijul huruf Al-Qur\'an tajwid dasar',
      'Membangun ingatan hafalan mandiri tertib juz 30 (Juz Amma) bertahap'
    ],
    equipment: 'Membawa Juz Amma pribadi atau mushaf Al-Qur\'an saku sendiri',
    coach: 'Guru Kelas / Wali Kelas Pendamping',
    bgColor: 'bg-amber-50',
    accentColor: 'text-amber-600',
    borderColor: 'hover:border-amber-200/80',
    shadowColor: 'hover:shadow-amber-100/30'
  },
  {
    title: 'Salat Dhuha dan Yasinan',
    description: 'Membentuk karakter religius dan meningkatkan keimanan siswa melalui kegiatan ibadah bersama.',
    image: salatDhuhaImg,
    icon: CheckCircle,
    category: 'Pembiasaan',
    schedule: 'Salat Dhuha: Hari Rabu pukul 07.00 WIB (30 menit). Yasinan: Hari Jumat pukul 07.00 WIB (30 menit).',
    benefits: [
      'Meningkatkan keimanan ketakwaan serta kematangan kecerdasan spiritual',
      'Mengajarkan ketertiban ibadah sunnah Salat Dhuha & pembacaan Yasin',
      'Menguatkan persatuan rukun ukhuwah antara guru pendamping & semua murid'
    ],
    equipment: 'Membawa sajadah & perlengkapan salat (Mukenah / sarung & peci)',
    coach: 'H. Munawati, S.Pd & Fatwamati, S.Pd.I (Dewan guru lainnya ikut berpartisipasi)',
    bgColor: 'bg-sky-50',
    accentColor: 'text-sky-600',
    borderColor: 'hover:border-sky-200/80',
    shadowColor: 'hover:shadow-sky-100/30'
  }
];

export default function Home() {
  const [stats, setStats] = useState({
    activeStudents: 271,
    teachers: 10,
    staff: 3,
    classrooms: 8,
    accreditation: 'B'
  });

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [kepsekName, setKepsekName] = useState('Nihayatul Faujiah, S.Pd');
  const [kepsekPhoto, setKepsekPhoto] = useState('https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600&auto=format&fit=crop');
  const [logo, setLogo] = useState(schoolLogo);
  const [cover, setCover] = useState('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=800&auto=format&fit=crop');
  const [coverTitle, setCoverTitle] = useState('Gedung Utama Cibojong 1');
  const [coverSubtitle, setCoverSubtitle] = useState('Padarincang, Serang');
  const [programTab, setProgramTab] = useState<'semua' | 'ekskul' | 'pembiasaan'>('semua');

  useEffect(() => {
    // Fetch critical announcements on landing page load
    fetch('/api/announcements')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAnnouncements(data.announcements.slice(0, 3));
        }
      })
      .catch(err => console.error('Error fetching announcements:', err));

    // Fetch teachers list to fetch custom Kepsek photo if uploaded
    fetch('/api/teachers')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const kepsek = data.teachers.find((t: any) => t.id === 't-1' || t.role === 'Kepala Sekolah');
          if (kepsek) {
            if (kepsek.photoUrl) {
              setKepsekPhoto(kepsek.photoUrl);
            }
            if (kepsek.name) {
              setKepsekName(kepsek.name);
            }
          }
        }
      })
      .catch(err => console.error('Error fetching teachers for home page:', err));

    // Fetch school settings
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.settings) {
          if (data.settings.logoUrl) setLogo(data.settings.logoUrl);
          if (data.settings.coverUrl) setCover(data.settings.coverUrl);
          if (data.settings.coverTitle) setCoverTitle(data.settings.coverTitle);
          if (data.settings.coverSubtitle) setCoverSubtitle(data.settings.coverSubtitle);
        }
      })
      .catch(err => console.error('Error fetching settings:', err));
  }, []);

  return (
    <div id="home-page" className="pt-20 overflow-x-hidden min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300">
      
      {/* 1. HERO SECTION */}
      <section className="relative bg-gradient-to-br from-blue-950 via-indigo-900 to-blue-900 text-white py-20 sm:py-28 px-4 overflow-hidden">
        {/* Subtle background circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 left-10 w-80 h-80 bg-blue-400/10 rounded-full blur-2xl"></div>

        <div className="max-w-7xl xl:max-w-[1500px] mx-auto px-6 lg:px-10 xl:px-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          
          {/* Hero Left: Heading & CTAs */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-4">
              <img
                src={logo}
                alt="Logo SDN Cibojong 1"
                referrerPolicy="no-referrer"
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-white p-1.5 border border-white/20 shadow-xl object-contain"
              />
              <div className="text-center lg:text-left">
                <span className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-500/25 text-blue-300 border border-blue-400/30 rounded-full text-xs font-semibold uppercase tracking-wider">
                  <GraduationCap className="h-4 w-4" />
                  <span>Penerimaan Siswa Baru TA 2026/2027</span>
                </span>
                <div className="text-[10px] sm:text-xs font-mono font-medium tracking-widest text-blue-200 mt-2 uppercase">
                  SDN Cibojong 1 Padarincang · NPSN 20606062
                </div>
              </div>
            </div>

            <h1 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight text-white leading-tight">
              Ayo Daftar Online <br className="hidden sm:inline" />
              <span className="text-blue-400">SDN Cibojong 1</span> Padarincang
            </h1>

            <p className="text-sm lg:text-lg text-blue-100 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-light">
              Membentuk pilar akademik yang kokoh, integritas karakter mulia, mandiri, berlandaskan budi pekerti luhur serta iman dan takwa sejak usia dini.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4 pt-2">
              <Link
                id="hero-cta-register"
                to="/formulir"
                className="flex items-center justify-center space-x-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3.5 rounded-full shadow-lg shadow-blue-500/30 border border-blue-500 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                <span>Daftar Sekarang (SPMB)</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                id="hero-cta-profile"
                href="#persyaratan"
                className="flex items-center justify-center space-x-2 bg-white/10 hover:bg-white/15 text-white border border-white/20 font-semibold px-8 py-3.5 rounded-full backdrop-blur-sm transition-all"
              >
                <span>Persyaratan</span>
              </a>
            </div>

            {/* Micro Highlights */}
            <div className="flex items-center justify-center lg:justify-start gap-6 pt-6 text-xs text-blue-200/80 font-mono">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                <span>Terakreditasi B</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                <span>Sistem Kuota Terpantau</span>
              </div>
            </div>
          </div>

          {/* Hero Right: Floating school image card placeholder */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div className="relative w-full max-w-md sm:max-w-lg overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-slate-800/40 p-3 backdrop-blur-md">
              <img
                src={cover}
                alt="Gedung SDN Cibojong 1"
                referrerPolicy="no-referrer"
                className="rounded-xl w-full h-80 object-cover brightness-95"
              />
              <div className="absolute inset-x-5 bottom-5 bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">{coverTitle}</h3>
                  <p className="text-xs text-slate-400">{coverSubtitle}</p>
                </div>
                <div className="bg-blue-600 px-3 py-1 rounded text-xs font-mono font-semibold">
                  NPSN 20606062
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>


      {/* 2. SAMBUTAN KEPALA SEKOLAH */}
      <section className="py-16 sm:py-24 bg-white transition-colors duration-300">
        <div className="max-w-7xl xl:max-w-[1500px] mx-auto px-6 lg:px-10 xl:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Frame: Headmaster Photo */}
            <div className="lg:col-span-4 flex justify-center">
              <div className="relative group">
                <div className="absolute inset-0 bg-blue-600 rounded-3xl rotate-3 scale-105 group-hover:rotate-1 group-hover:scale-100 transition-all duration-300"></div>
                <div className="relative bg-slate-100 p-2 rounded-3xl shadow-xl max-w-xs overflow-hidden z-10 border border-slate-200">
                  <img
                    src={kepsekPhoto}
                    alt="Kepala Sekolah SDN Cibojong 1"
                    className="w-full aspect-[2/3] object-cover rounded-2xl grayscale hover:grayscale-0 transition-all duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="mt-4 pb-2 text-center">
                    <h3 className="font-extrabold text-lg text-slate-900">{kepsekName}</h3>
                    <p className="text-xs text-blue-600 font-mono font-bold">Kepala Sekolah SDN Cibojong 1</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Frame: Welcome Speech */}
            <div className="lg:col-span-8 space-y-6">
              <span className="text-xs font-mono font-bold text-blue-650 uppercase tracking-widest block">
                SAMBUTAN KEPALA SEKOLAH
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Selamat Datang di Portal Penerimaan Calon Siswa Baru
              </h2>
              <p className="text-slate-705 text-base sm:text-lg leading-relaxed font-sans">
                Assalamu’alaikum Warahmatullahi Wabarakatuh,<br /><br />
                Salam sejahtera bagi kita semua. Kami mengucapkan selamat datang kepada bapak/ibu orang tua calon siswa di SDN Cibojong 1 Padarincang. Pendidikan adalah investasi berharga bagi masa depan putra-putri kita. Di SDN Cibojong 1, kami berkomitmen menciptakan lingkungan belajar yang aman, ramah, dan kondusif untuk mendukung talenta setiap siswa.
              </p>
              <p className="text-slate-705 text-base sm:text-lg leading-relaxed font-sans">
                Kami meluncurkan sistem pendaftaran online (SPMB 2026/2027) untuk memfasilitasi bapak/ibu sekalian melakukan pendaftaran dari rumah dengan tertib, cepat, dan transparan. Terima kasih telah mempercayakan tumbuh kembang buah hati Anda di lingkungan akademik kami.
              </p>
              
              <div className="pt-4 flex items-center gap-4">
                <div className="h-1 bg-blue-600 w-16"></div>
                <span className="font-mono text-xs text-slate-550 uppercase tracking-wider font-bold">Maju bersama mencetak anak bangsa</span>
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* 3. STATISTIK GRID */}
      <section className="py-12 bg-slate-900 text-white">
        <div className="max-w-7xl xl:max-w-[1500px] mx-auto px-6 lg:px-10 xl:px-16">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 text-center">
            
            <div className="space-y-2">
              <div className="inline-flex p-3 rounded-full bg-blue-800/50 text-blue-400">
                <Users className="h-6 w-6" />
              </div>
              <p className="text-4xl font-bold text-white font-mono">{stats.activeStudents}</p>
              <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Siswa Aktif</p>
            </div>

            <div className="space-y-2">
              <div className="inline-flex p-3 rounded-full bg-blue-800/50 text-blue-400">
                <Award className="h-6 w-6" />
              </div>
              <p className="text-4xl font-bold text-white font-mono">{stats.teachers}</p>
              <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Guru</p>
            </div>

            <div className="space-y-2">
              <div className="inline-flex p-3 rounded-full bg-blue-800/50 text-blue-400">
                <Users className="h-6 w-6" />
              </div>
              <p className="text-4xl font-bold text-white font-mono">{stats.staff}</p>
              <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Staf</p>
            </div>

            <div className="space-y-2">
              <div className="inline-flex p-3 rounded-full bg-blue-800/50 text-blue-400">
                <BookOpen className="h-6 w-6" />
              </div>
              <p className="text-4xl font-bold text-white font-mono">{stats.classrooms}</p>
              <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Ruang Kelas</p>
            </div>

            <div className="space-y-2">
              <div className="inline-flex p-3 rounded-full bg-emerald-800/50 text-emerald-400">
                <GraduationCap className="h-6 w-6" />
              </div>
              <p className="text-4xl font-bold text-emerald-400 font-mono">{stats.accreditation}</p>
              <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Akreditasi BAN-SM</p>
            </div>

          </div>
        </div>
      </section>


      {/* 4. VISI DAN MISI */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-slate-50 to-blue-50/50 transition-colors duration-300">
        <div className="max-w-7xl xl:max-w-[1500px] mx-auto px-6 lg:px-10 xl:px-16">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block">
              NILAI INDUK LEMBAGA PENDIDIKAN
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Visi & Kredo Misi SDN Cibojong 1
            </h2>
            <div className="h-1 bg-blue-600 w-20 mx-auto rounded"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            
            {/* Vision Card */}
            <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-lg border border-blue-50 flex flex-col justify-between transition-colors duration-300">
              <div>
                <div className="h-12 w-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 mb-6">
                  <Compass className="h-6 w-6" />
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-4 uppercase tracking-snug">Visi Utama</h3>
                <p className="text-slate-705 text-lg leading-relaxed italic">
                  &ldquo;Terwujudnya peserta didik yang bertaqwa kepada Tuhan Yang Maha Esa, cerdas, kreatif, mandiri, peduli lingkungan, serta unggul dalam prestasi akademik maupun non-akademik di Kabupaten Serang.&rdquo;
                </p>
              </div>
              <div className="pt-6 border-t border-slate-100 mt-8 text-slate-500 text-xs tracking-wide font-medium">
                Ditetapkan dalam rapat koordinasi komite SDN Cibojong 1.
              </div>
            </div>

            {/* Mission Card */}
            <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-lg border border-blue-50 transition-colors duration-300">
              <div className="h-12 w-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 mb-6">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-4 uppercase tracking-snug">Misi Kami</h3>
              
              <ul className="space-y-4">
                {[
                  "Menyelenggarakan pembelajaran berkualitas berdasarkan kurikulum nasional berbasis pengembangan budi pekerti yang kuat.",
                  "Menanamkan keyakinan beragama, kejujuran, sportivitas, serta empati sosial melalui pembiasaan harian.",
                  "Melaksanakan pembinaan prestasi siswa di bidang olahraga, seni kaligrafi Islami, cerdas cermat, serta sains tingkat kota.",
                  "Menciptakan lingkungan halaman sekolah yang asri, hijau, bebas genangan, dan tertib tata hijau."
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start space-x-3 text-sm text-slate-705">
                    <span className="h-5 w-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed font-sans">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </section>


      {/* 5. PROGRAM EKSTRAKURIKULER & PEMBIASAAN (Modern grid with cards, filter tabs, hover tilt, and accordions) */}
      <section className="py-20 bg-gradient-to-b from-white via-slate-50 to-white border-y border-slate-100 transition-colors duration-300">
        <div className="max-w-7xl xl:max-w-[1500px] mx-auto px-6 lg:px-10 xl:px-16">
          
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200/60 px-3 py-1 rounded-full uppercase tracking-wider block w-fit mx-auto">
              Bakat, Keterampilan &amp; Karakter Positif
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Program Unggulan Siswa
            </h2>
            <div className="h-1 bg-gradient-to-r from-blue-500 to-orange-500 w-24 mx-auto rounded-full" />
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
              Mengembangkan potensi minat, kecakapan jasmani, keluhuran budi, serta kegiatan kebiasaan harian penunjang akademik moral siswa SDN Cibojong 1.
            </p>
          </div>

          {/* Filter Tabs Controller */}
          <div className="flex justify-center mb-12">
            <div className="bg-slate-100 p-1.5 rounded-2xl inline-flex gap-1.5 border border-slate-205 shadow-inner max-w-full overflow-x-auto">
              {(['semua', 'ekskul', 'pembiasaan'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setProgramTab(tab)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs tracking-wide transition-all duration-300 shrink-0 cursor-pointer ${ programTab === tab ? 'bg-white text-blue-600 shadow-md border border-slate-200/20 ' : 'text-slate-600 hover:text-slate-850 hover:bg-white/40' }`}
                >
                  {tab === 'semua' 
                    ? 'Semua Program' 
                    : tab === 'ekskul' 
                      ? 'Ekstrakurikuler' 
                      : 'Program Pembiasaan'}
                </button>
              ))}
            </div>
          </div>

          {/* Stagger Grid Section */}
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch mb-16"
          >
            <AnimatePresence mode="popLayout">
              {ALL_PROGRAMS
                .filter(prog => {
                  if (programTab === 'semua') return true;
                  if (programTab === 'ekskul') return prog.category === 'Ekstrakurikuler';
                  if (programTab === 'pembiasaan') return prog.category === 'Pembiasaan';
                  return true;
                })
                .map((program, idx) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                    key={program.title}
                    className="h-full"
                  >
                    <ProgramCard program={program} index={idx} />
                  </motion.div>
                ))
              }
            </AnimatePresence>
          </motion.div>

          {/* Goals / Tujuan Program Banner */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 sm:p-10 flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-xl shadow-slate-950/15">
            {/* Soft decorative background glow */}
            <div className="absolute right-0 top-0 h-40 w-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute left-1/3 bottom-0 h-40 w-40 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-2 text-center lg:text-left relative z-10 max-w-xl">
              <span className="text-[10px] font-bold text-blue-400 font-mono tracking-widest uppercase">Misi Utama Kita</span>
              <h4 className="font-extrabold text-white text-xl sm:text-2xl tracking-tight">Membentuk Generasi SDN Cibojong 1 yang Unggul</h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Pendidikan holistik yang mewadahi keseimbangan intelek, kesegaran jasmani, moralitas spiritual, serta keteguhan budi pekerti yang mulia.
              </p>
            </div>
            
            {/* Minimalist target metrics badges */}
            <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2.5 max-w-md relative z-10">
              {['Cerdas', 'Aktif', 'Disiplin', 'Kreatif', 'Sopan', 'Sholeh & Sholehah'].map((tgt) => (
                <span key={tgt} className="px-4 py-2 bg-slate-800/80 backdrop-blur-sm text-slate-200 border border-slate-700/60 font-bold text-xs rounded-full shadow-sm">
                  ✓ {tgt}
                </span>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* 6. JADWAL SPMB SECTION */}
      <section id="jadwal-spmb" className="py-16 bg-blue-50/40 border-y border-blue-100/40 transition-colors duration-300">
        <div className="max-w-7xl xl:max-w-[1500px] mx-auto px-6 lg:px-10 xl:px-16">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-105 text-yellow-800 rounded-full font-mono text-[10px] uppercase font-bold tracking-wider">
              <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></span>
              Status: Yang Akan Datang
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Jadwal Pelaksanaan SPMB 2026/2027</h2>
            <div className="h-1 bg-blue-600 w-20 mx-auto rounded"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 relative">
            
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 relative hover:shadow-md transition-all">
              <div className="text-[36px] font-bold text-blue-100 absolute right-3 top-2 select-none leading-none">01</div>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-mono text-[10px] uppercase font-bold rounded border border-blue-100">Tahap 1</span>
              <h4 className="font-extrabold text-slate-900 mt-4 mb-2 text-xs sm:text-sm leading-tight">Pembukaan Sosialisasi</h4>
              <p className="text-[11px] text-blue-600 font-bold font-mono mb-2">05 Mei – 31 Mei 2026</p>
              <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Pemberitahuan informasi, penyebaran brosur, dan persiapan administrasi.</p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 relative hover:shadow-md transition-all">
              <div className="text-[36px] font-bold text-blue-100 absolute right-3 top-2 select-none leading-none">02</div>
              <span className="px-2 py-0.5 bg-orange-50 text-orange-700 font-mono text-[10px] uppercase font-bold rounded border border-orange-100">Tahap 2</span>
              <h4 className="font-extrabold text-slate-900 mt-4 mb-2 text-xs sm:text-sm leading-tight">Pendaftaran Online</h4>
              <p className="text-[11px] text-orange-600 font-bold font-mono mb-2">21 Jun – 30 Jun 2026</p>
              <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Pengisian form pendaftaran dan upload berkas mandiri via online.</p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 relative hover:shadow-md transition-all">
              <div className="text-[36px] font-bold text-blue-100 absolute right-3 top-2 select-none leading-none">03</div>
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-mono text-[10px] uppercase font-bold rounded border border-indigo-100">Tahap 3</span>
              <h4 className="font-extrabold text-slate-900 mt-4 mb-2 text-xs sm:text-sm leading-tight">Seleksi & Verifikasi Berkas</h4>
              <p className="text-[11px] text-indigo-600 font-bold font-mono mb-2">1 Juli – 5 Juli 2026</p>
              <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Pemeriksaan dan pencocokan keabsahan dokumen oleh panitia.</p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 relative hover:shadow-md transition-all">
              <div className="text-[36px] font-bold text-blue-100 absolute right-3 top-2 select-none leading-none">04</div>
              <span className="px-2 py-0.5 bg-teal-50 text-teal-700 font-mono text-[10px] uppercase font-bold rounded border border-teal-100">Tahap 4</span>
              <h4 className="font-extrabold text-slate-900 mt-4 mb-2 text-xs sm:text-sm leading-tight">Pengumuman Hasil</h4>
              <p className="text-[11px] text-teal-600 font-bold font-mono mb-2">07 Juli 2026</p>
              <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Pengumuman kelulusan berkas administrasi secara daring.</p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 relative hover:shadow-md transition-all">
              <div className="text-[36px] font-bold text-blue-100 absolute right-3 top-2 select-none leading-none">05</div>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-mono text-[10px] uppercase font-bold rounded border border-emerald-100">Tahap 5</span>
              <h4 className="font-extrabold text-slate-900 mt-4 mb-2 text-xs sm:text-sm leading-tight">Daftar Ulang</h4>
              <p className="text-[11px] text-emerald-600 font-bold font-mono mb-2">8 Juli – 11 Juli 2026</p>
              <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Proses pendaftaran kembali dan penyerahan berkas fisik asli.</p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 relative hover:shadow-md transition-all">
              <div className="text-[36px] font-bold text-blue-100 absolute right-3 top-2 select-none leading-none">06</div>
              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 font-mono text-[10px] uppercase font-bold rounded border border-purple-100">Tahap 6</span>
              <h4 className="font-extrabold text-slate-900 mt-4 mb-2 text-xs sm:text-sm leading-tight">Masuk Sekolah</h4>
              <p className="text-[11px] text-purple-600 font-bold font-mono mb-2">Sekitar 13 Juli 2026</p>
              <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Awal masuk tahun ajaran baru & masa pengenalan lingkungan.</p>
            </div>

          </div>
        </div>
      </section>


      {/* QR CODE SCAN SECTION */}
      <QRSection />


      {/* 7. PERSYARATAN PENDAFTARAN */}
      <section id="persyaratan" className="py-16 sm:py-24 bg-white text-slate-900 transition-colors duration-300">
        <div className="max-w-7xl xl:max-w-[1500px] mx-auto px-6 lg:px-10 xl:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Persyaratan Left */}
            <div className="lg:col-span-5 space-y-4">
              <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider inline-block">
                INFORMASI UTAMA
              </span>
              <h2 className="text-3.5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Persyaratan & Dokumen Wajib Calon Siswa
              </h2>
              <p className="text-slate-650 text-sm leading-relaxed font-sans">
                Bapak/Ibu orang tua siswa wajib melengkapi dokumen administrasi di bawah dalam bentuk file (JPG, PNG, atau PDF) dengan ukuran maksimal 2MB per file pada saat mengisi form pendaftaran online.
              </p>
              <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-r-xl">
                <p className="text-xs text-yellow-800 font-medium font-sans">
                  <strong>PENTING:</strong> Calon siswa sekurang-kurangnya wajib berusia 6 tahun pada 1 Juli 2026. Persetujuan anak di bawah usia 6 tahun memerlukan rekomendasi psikolog profesional tertulis.
                </p>
              </div>
            </div>

            {/* Persyaratan Right */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex gap-4 transition-colors duration-300">
                <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 mb-1">Kartu Keluarga (KK)</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-sans">
                    Fotokopi KK yang jelas terlihat NIK anak dan data orang tua (format PDF/JPG).
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex gap-4 transition-colors duration-300">
                <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 mb-1">Akta Kelahiran</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-sans">
                    Bukti autentik usia anak untuk dicocokkan dengan kriteria minimal kementerian pendidikan.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex gap-4 transition-colors duration-300">
                <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 mb-1">Pas Foto Berwarna</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-sans">
                    Pas foto anak terbaru ukuran 3x4 berwarna dengan latar belakang merah atau biru.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex gap-4 transition-colors duration-300">
                <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 mb-1">KIP / KKS / PKH (Bila Ada)</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-sans">
                    Kartu Indonesia Pintar untuk mempermudah sinkronisasi dana bantuan PIP kedepannya.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex gap-4 sm:col-span-2 transition-colors duration-300">
                <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-sm text-slate-900">Ijazah TK (Bila Ada)</h4>
                    <span className="px-1.5 py-0.5 bg-slate-200 text-slate-650 font-mono text-[9px] uppercase font-bold rounded">Opsional</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mt-0.5 font-sans">
                    Scan bukti kelulusan PAUD / TK Maslahat jika ada demi kemudahan verifikasi kesiapan belajar siswa.
                  </p>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>


      {/* 8. TESTIMONIAL ORANG TUA */}
      <section className="py-16 bg-slate-900 text-white relative">
        <div className="max-w-7xl xl:max-w-[1500px] mx-auto px-6 lg:px-10 xl:px-16">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">KATA ORANG TUA</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Testimoni Apresiasi Wali Siswa</h2>
            <div className="h-1 bg-blue-500 w-20 mx-auto rounded"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 shadow-xl flex flex-col justify-between">
              <p className="text-slate-300 text-sm leading-relaxed italic">
                "Anak saya sangat bahagia bersekolah di SDN Cibojong 1. Proses belajarnya religius dengan adanya hafalan surat pendek setiap pagi, dan guru-gurunnya sangat bersahaja serta penuh perhatian kepada murid."
              </p>
              <div className="mt-6 flex items-center gap-3 border-t border-slate-700/60 pt-4">
                <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                  IB
                </div>
                <div>
                  <h5 className="font-bold text-xs">Ibu Badriah</h5>
                  <p className="text-[10px] text-slate-400">Orang tua Alif (Kelas 3)</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 shadow-xl flex flex-col justify-between">
              <p className="text-slate-300 text-sm leading-relaxed italic">
                "Pilihan terbaik mendaftarkan anak di sini. Selain biayanya gratis didukung BOS, banyak lomba-lomba pramuka dan olimpiade yang bisa diikuti anak untuk melatih mental kepemimpinannya!"
              </p>
              <div className="mt-6 flex items-center gap-3 border-t border-slate-700/60 pt-4">
                <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                  PA
                </div>
                <div>
                  <h5 className="font-bold text-xs">Pak Ahmad</h5>
                  <p className="text-[10px] text-slate-400">Orang tua Nisa (Kelas 5)</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 shadow-xl flex flex-col justify-between">
              <p className="text-slate-300 text-sm leading-relaxed italic">
                "Sistem pendaftaran online SPMB ini sangat membantu. Kami tidak perlu bolak-balik antre di sekolah saat jam kerja kantor. Cukup melampirkan berkas dari handphone saja, praktis sekali!"
              </p>
              <div className="mt-6 flex items-center gap-3 border-t border-slate-700/60 pt-4">
                <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                  IS
                </div>
                <div>
                  <h5 className="font-bold text-xs">Ibu Susan</h5>
                  <p className="text-[10px] text-slate-400">Orang tua Zidan (Pendaftar Baru)</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* 9. PENGUMUMAN TERKINI (Quick view) */}
      {announcements.length > 0 && (
        <section className="py-16 bg-white text-slate-900 transition-colors duration-300 border-t border-slate-100">
          <div className="max-w-7xl xl:max-w-[1500px] mx-auto px-6 lg:px-10 xl:px-16">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block font-sans">KOMUNIKASI AKTIF</span>
                <h2 className="text-2.5xl sm:text-3.5xl font-extrabold text-slate-900 tracking-tight">Pengumuman Terbaru Sekolah</h2>
              </div>
              <Link
                to="/pengumuman"
                className="inline-flex items-center space-x-2 text-sm font-bold text-blue-600 hover:text-blue-500 hover:underline"
              >
                <span>Lihat Semua Pengumuman</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {announcements.map((ann) => (
                <div 
                  key={ann.id} 
                  className="bg-slate-50 hover:bg-slate-100/60 rounded-2xl p-6 border border-slate-100 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-full bg-blue-105 text-blue-800 font-mono text-[10px] font-bold uppercase">
                        {ann.category}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{ann.date}</span>
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-sm line-clamp-1">{ann.title}</h4>
                    <p className="text-xs text-slate-650 leading-relaxed line-clamp-4 font-sans">{ann.content}</p>
                  </div>
                  <div className="pt-4 border-t border-slate-200/50 mt-4 text-[10px] text-slate-500 font-mono">
                    Penulis: {ann.author}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
