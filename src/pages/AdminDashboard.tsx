import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { auth, signInWithGoogle } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import schoolLogo from '../assets/school_logo.png';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  Users, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search,
  ShieldAlert,
  KeyRound,
  Database,
  RefreshCw, 
  Download, 
  Trash2, 
  LogOut, 
  Plus, 
  Megaphone, 
  Image as ImageIcon, 
  Inbox, 
  Check, 
  Settings,
  Calendar,
  Sparkles,
  CircleDot,
  Menu,
  X,
  FileSpreadsheet,
  Grid,
  ChevronRight,
  Info,
  CalendarDays,
  Camera,
  Layers,
  GraduationCap,
  ArrowRight,
  Eye,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Lightweight browser-safe helper to parse JWT payload
const decodeToken = (t: string) => {
  try {
    const base64Url = t.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (err) {
    return null;
  }
};

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  // Authentication and Session Token
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('adminToken'));
  const [loggingIn, setLoggingIn] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [deniedEmail, setDeniedEmail] = useState('');

  // Layout navigation states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'announcements' | 'gallery' | 'messages' | 'teachers' | 'settings' | 'spmb_settings' | 'document_settings' | 'admin_users' | 'login_logs'>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Decoded user memoization from JWT token
  const loggedInUser = React.useMemo(() => {
    return token ? decodeToken(token) : null;
  }, [token]);

  const navSidebarMenus = React.useMemo(() => {
    const list = [
      { id: 'dashboard', name: 'Dashboard', icon: Grid },
      { id: 'students', name: 'Data Siswa / Formulir', icon: FileText },
      { id: 'announcements', name: 'Kelola Pengumuman', icon: Megaphone },
      { id: 'teachers', name: 'Kelola Guru & Staf', icon: Users },
      { id: 'gallery', name: 'Galeri Sekolah', icon: ImageIcon },
      { id: 'messages', name: 'Pesan Masuk', icon: Inbox },
      { id: 'settings', name: 'Pengaturan Website', icon: Settings },
      { id: 'spmb_settings', name: 'Pengaturan SPMB', icon: GraduationCap },
      { id: 'document_settings', name: 'Penandatangan Dokumen', icon: FileText },
    ];
    if (loggedInUser?.role === 'Superadmin') {
      list.push(
        { id: 'admin_users', name: 'Pengguna Admin', icon: ShieldAlert },
        { id: 'login_logs', name: 'Log Aktivitas', icon: KeyRound }
      );
    }
    return list;
  }, [loggedInUser]);

  // Credentials-based Authentication state
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [loginVal, setLoginVal] = useState({ usernameOrEmail: '', password: '' });
  const [regVal, setRegVal] = useState({ fullname: '', username: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [forgotVal, setForgotVal] = useState({ email: '' });
  const [resetVal, setResetVal] = useState({ token: '', password: '', confirmPassword: '' });

  // Admin users and Security login activity logs
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [loginLogs, setLoginLogs] = useState<any[]>([]);
  const [isRestoring, setIsRestoring] = useState(false);

  // Core CMS state metrics
  const [stats, setStats] = useState<any | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [schoolSettings, setSchoolSettings] = useState({ 
    logoUrl: '', 
    coverUrl: '', 
    coverTitle: 'Gedung Utama Cibojong 1', 
    coverSubtitle: 'Padarincang, Serang', 
    profileCoverUrl: '',
    isRegistrationClosed: false
  });

  // Dynamic user inputs
  const [coverTitleInput, setCoverTitleInput] = useState('');
  const [coverSubtitleInput, setCoverSubtitleInput] = useState('');

  // Document Settings (Panitia & Signatures) States
  const [docSettings, setDocSettings] = useState<any>({
    committee_name: '',
    committee_position: '',
    committee_nip: '',
    committee_signature: '',
    committee_stamp: ''
  });
  const [committeeNameInput, setCommitteeNameInput] = useState('');
  const [committeePositionInput, setCommitteePositionInput] = useState('');
  const [committeeNipInput, setCommitteeNipInput] = useState('');

  // Search & Filter conditions
  const [searchStudent, setSearchStudent] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Selected student state for modal editing/verification
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<'PENDING' | 'VERIFIED' | 'REJECTED'>('PENDING');
  const [verifyComment, setVerifyComment] = useState('');
  const [editStudentForm, setEditStudentForm] = useState<any>({});
  const [isEditingStudent, setIsEditingStudent] = useState(false);

  // New item draft templates
  const [newAnn, setNewAnn] = useState({ title: '', content: '', category: 'SPMB', author: 'Sekolah' });
  const [newGal, setNewGal] = useState({ title: '', description: '', imageUrl: '', category: 'Kegiatan' });

  // Clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real weather info mock
  const weatherTemp = "29°C Berawan";

  // Synchronization with WIB clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Protected route validation checks
  useEffect(() => {
    const path = location.pathname;
    
    if (path === '/admin') {
      if (token) {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/admin/login', { replace: true });
      }
    } else if (path === '/admin/login') {
      if (token) {
        navigate('/admin/dashboard', { replace: true });
      }
    } else if (path === '/admin/dashboard') {
      if (!token) {
        navigate('/admin/login', { replace: true });
      }
    }
  }, [location.pathname, token, navigate]);

  // Sync data on Token mount or update
  useEffect(() => {
    if (token) {
      fetchStats();
      fetchStudents();
      fetchAnnouncements();
      fetchGallery();
      fetchMessages();
      fetchTeachers();
      fetchSchoolSettings();
      fetchSpmbSettings();
      fetchDocumentSettings();
    }
  }, [token]);

  // Listen for registration verification and password reset token redirections on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('verified') === 'true') {
      Swal.fire({
        icon: 'success',
        title: 'Verifikasi Berhasil',
        text: 'Alamat email Anda sukses diverifikasi. Akun Anda telah aktif dan siap digunakan.',
        confirmButtonColor: '#2563EB'
      });
      navigate('/admin/login', { replace: true });
    } else {
      const resetToken = params.get('resetToken');
      if (resetToken) {
        setAuthMode('reset');
        setResetVal(prev => ({ ...prev, token: resetToken }));
        navigate('/admin/login', { replace: true });
      }
    }
  }, [location.search, navigate]);

  const fetchAdminUsers = () => {
    if (!token) return;
    fetch('/api/admin/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAdminUsers(data.users);
        } else {
          console.warn('Gagal memuat pengguna:', data.message);
        }
      })
      .catch(err => console.error('Error loading admin users:', err));
  };

  const fetchLoginLogs = () => {
    if (!token) return;
    fetch('/api/admin/login-logs', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLoginLogs(data.logs);
        } else {
          console.warn('Gagal memuat log:', data.message);
        }
      })
      .catch(err => console.error('Error loading login logs:', err));
  };

  // Lazy load administrative stats on active tab change
  useEffect(() => {
    if (token && loggedInUser?.role === 'Superadmin') {
      if (activeTab === 'admin_users') {
        fetchAdminUsers();
      } else if (activeTab === 'login_logs') {
        fetchLoginLogs();
      }
    }
  }, [activeTab, token, loggedInUser]);

  const [spmbSettings, setSpmbSettings] = useState<any | null>(null);

  const fetchDocumentSettings = () => {
    fetch('/api/document-settings')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.settings) {
          setDocSettings(data.settings);
          setCommitteeNameInput(data.settings.committee_name || '');
          setCommitteePositionInput(data.settings.committee_position || '');
          setCommitteeNipInput(data.settings.committee_nip || '');
        }
      })
      .catch(err => console.error('Error loading doc settings:', err));
  };

  const fetchSpmbSettings = () => {
    fetch('/api/spmb-settings')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.settings) {
          setSpmbSettings(data.settings);
        }
      })
      .catch(err => console.error('Error loading SPMB settings:', err));
  };

  const handleSpmbSubmit = async (formData: {
    registration_open: string;
    registration_close: string;
    quota_limit: number;
    registration_active: boolean;
    waiting_list_enabled: boolean;
  }) => {
    // 1. Validate opening and closing date sequence
    if (new Date(formData.registration_close) <= new Date(formData.registration_open)) {
      Swal.fire({ 
        icon: 'error', 
        title: 'Validasi Tanggal Gagal', 
        text: 'Tanggal Tutup harus setelah Tanggal Buka!', 
        confirmButtonColor: '#2563eb' 
      });
      return;
    }

    // 2. Count verified students in frontend state to prevent submission and warn
    const verifiedCount = students.filter((s: any) => s && (s.status === 'VERIFIED' || s.status === 'Terverifikasi')).length;
    if (formData.quota_limit < verifiedCount) {
      Swal.fire({
        icon: 'error',
        title: 'Validasi Daya Tampung',
        text: `Batas kuota baru (${formData.quota_limit}) tidak boleh lebih kecil dari siswa terverifikasi saat ini (${verifiedCount}).`,
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    // 3. Preserve backup of state for auto-rollback
    const previousSettings = { ...spmbSettings };

    // 4. Optimistic Update: instantly update state so UI responds in real-time
    setSpmbSettings({
      ...spmbSettings,
      ...formData
    });

    Swal.fire({
      title: 'Sinkronisasi ke Firestore...',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 1000,
      didOpen: () => Swal.showLoading()
    });

    try {
      const res = await fetch('/api/spmb-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        // Rolback to previous settings if server returns an error
        setSpmbSettings(previousSettings);
        Swal.fire({
          icon: 'error',
          title: 'Pembaharuan Gagal',
          text: data.message || 'Gagal menyimpan konfigurasi SPMB ke Firestore.',
          confirmButtonColor: '#ef4444'
        });
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Aturan Disimpan',
          text: 'Konfigurasi SPMB berhasil disinkronkan secara transaksional!',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
        fetchSpmbSettings();
        fetchStats();
      }
    } catch (err) {
      // Rollback on network failure
      setSpmbSettings(previousSettings);
      Swal.fire({
        icon: 'error',
        title: 'Kesalahan Sinkronisasi',
        text: 'Tidak dapat menghubungi server. Konfigurasi dikembalikan ke semula.',
        confirmButtonColor: '#ef4444'
      });
    }
  };

  const fetchSchoolSettings = () => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.settings) {
          setSchoolSettings(data.settings);
          setCoverTitleInput(data.settings.coverTitle || 'Gedung Utama Cibojong 1');
          setCoverSubtitleInput(data.settings.coverSubtitle || 'Padarincang, Serang');
        }
      })
      .catch(err => console.error('Error fetching settings:', err));
  };

  const fetchStats = () => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        if (data.success) setStats(data.stats);
      })
      .catch(err => console.error('Error loading stats:', err));
  };

  const fetchStudents = () => {
    fetch('/api/students')
      .then(res => res.json())
      .then(data => {
        if (data.success) setStudents(data.students);
      })
      .catch(err => console.error('Error loading students:', err));
  };

  const fetchAnnouncements = () => {
    fetch('/api/announcements')
      .then(res => res.json())
      .then(data => {
        if (data.success) setAnnouncements(data.announcements);
      })
      .catch(err => console.error('Error loading announcements:', err));
  };

  const fetchGallery = () => {
    fetch('/api/gallery')
      .then(res => res.json())
      .then(data => {
        if (data.success) setGallery(data.gallery);
      })
      .catch(err => console.error('Error loading gallery:', err));
  };

  const fetchMessages = () => {
    fetch('/api/messages', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (res.status === 401) {
          handleSessionExpired();
          throw new Error('Unauthorized');
        }
        return res.json();
      })
      .then(data => {
        if (data.success) setMessages(data.messages);
      })
      .catch(err => {
        if (err.message !== 'Unauthorized') console.error('Error loading messages:', err);
      });
  };

  const fetchTeachers = () => {
    fetch('/api/teachers')
      .then(res => res.json())
      .then(data => {
        if (data.success) setTeachers(data.teachers);
      })
      .catch(err => console.error('Error loading teachers:', err));
  };

  const handleSessionExpired = () => {
    localStorage.removeItem('adminToken');
    setToken(null);
    Swal.fire({
      icon: 'warning',
      title: 'Sesi Berakhir',
      text: 'Silakan login kembali untuk mengelola website.',
      confirmButtonColor: '#2563EB'
    });
    navigate('/admin/login');
  };

  // Credentials-based Custom Authentication Actions
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginVal.usernameOrEmail || !loginVal.password) {
      Swal.fire({ icon: 'warning', title: 'Data Kurang', text: 'Silakan isi Username/Email dan Password.', confirmButtonColor: '#2563EB' });
      return;
    }

    setLoggingIn(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginVal)
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('adminToken', data.token);
        setToken(data.token);
        setLoginVal({ usernameOrEmail: '', password: '' });
        Swal.fire({
          icon: 'success',
          title: 'Login Berhasil',
          text: `Selamat datang kembali, ${data.admin.fullname}!`,
          confirmButtonColor: '#2563EB',
          timer: 1800,
          showConfirmButton: false
        });
        navigate('/admin/dashboard');
      } else {
        Swal.fire({ icon: 'error', title: 'Login Gagal', text: data.message || 'Kredensial tidak sah.', confirmButtonColor: '#2563EB' });
      }
    } catch (err) {
      console.error('Login error:', err);
      Swal.fire({ icon: 'error', title: 'Kendala Jaringan', text: 'Gagal terhubung dengan server sekolah.', confirmButtonColor: '#2563EB' });
    } finally {
      setLoggingIn(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regVal.fullname || !regVal.username || !regVal.email || !regVal.password) {
      Swal.fire({ icon: 'warning', title: 'Data Kurang', text: 'Harap isi semua field wajib.', confirmButtonColor: '#2563EB' });
      return;
    }
    if (regVal.password !== regVal.confirmPassword) {
      Swal.fire({ icon: 'error', title: 'Kecocokan Gagal', text: 'Konfirmasi password baru tidak cocok.', confirmButtonColor: '#2563EB' });
      return;
    }

    setLoggingIn(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regVal)
      });
      const data = await res.json();
      if (data.success) {
        setRegVal({ fullname: '', username: '', email: '', phone: '', password: '', confirmPassword: '' });
        
        // Show simulated activation flow in trial environment
        if (data.token) {
          const simLink = `/api/auth/verify?token=${data.token}`;
          Swal.fire({
            icon: 'success',
            title: 'Pendaftaran Sukses!',
            html: `
              <div class="text-left text-xs leading-relaxed space-y-2 mt-2">
                <p>${data.message}</p>
                <div class="border-t border-slate-100 pt-2 mt-2">
                  <p class="font-bold text-blue-600">⚡ Simulator Autentikasi SDN Cibojong 1:</p>
                  <p class="text-slate-500">Karena email asli membutuhkan SMTP/Resend API Key, Anda dapat mengklik tombol simulator di bawah ini untuk mengaktifkan akun secara instan tanpa membuka inbox:</p>
                  <a href="${simLink}" class="mt-2 block w-full text-center bg-blue-600 font-bold hover:bg-blue-700 text-white rounded-lg py-2.5 no-underline transition-all ring-1 ring-blue-500 text-xs">Aktivasi Akun Instan (Bypass)</a>
                </div>
              </div>
            `,
            confirmButtonColor: '#64748B',
            confirmButtonText: 'Tutup'
          });
        } else {
          Swal.fire({ icon: 'success', title: 'Pendaftaran Berhasil', text: data.message, confirmButtonColor: '#2563EB' });
        }
        setAuthMode('login');
      } else {
        Swal.fire({ icon: 'error', title: 'Pendaftaran Gagal', text: data.message || 'Terjadi kesalahan.', confirmButtonColor: '#2563EB' });
      }
    } catch (err) {
      console.error('Register error:', err);
      Swal.fire({ icon: 'error', title: 'Kendala Jaringan', text: 'Gagal meregistrasikan akun admin.', confirmButtonColor: '#2563EB' });
    } finally {
      setLoggingIn(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotVal.email) {
      Swal.fire({ icon: 'warning', title: 'Harap Isi Email', text: 'Silakan cantumkan email pendaftaran Anda.', confirmButtonColor: '#2563EB' });
      return;
    }

    setLoggingIn(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(forgotVal)
      });
      const data = await res.json();
      if (data.success) {
        setForgotVal({ email: '' });
        if (data.token) {
          const resetSimLink = `/admin/login?resetToken=${data.token}`;
          Swal.fire({
            icon: 'info',
            title: 'Ubah Kata Sandi Terkirim',
            html: `
              <div class="text-left text-xs leading-relaxed space-y-2 mt-2">
                <p>${data.message}</p>
                <div class="border-t border-slate-100 pt-2 mt-2">
                  <p class="font-bold text-amber-600">⚡ Simulator Reset Sandi:</p>
                  <p class="text-slate-500">Anda dapat memotong verifikasi inbox email dengan langsung mengklik tautan simulator di bawah:</p>
                  <p class="text-slate-500 text-[10px] my-1">${window.location.origin}${resetSimLink}</p>
                  <a href="${resetSimLink}" class="mt-2 block w-full text-center bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg py-2.5 border-none transition-all no-underline text-xs">Formulir Reset Password (Bypass)</a>
                </div>
              </div>
            `,
            confirmButtonColor: '#64748B',
            confirmButtonText: 'Tutup'
          });
        } else {
          Swal.fire({ icon: 'success', title: 'Ubah Kata Sandi Terkirim', text: data.message, confirmButtonColor: '#2563EB' });
        }
        setAuthMode('login');
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal Memproses', text: data.message, confirmButtonColor: '#2563EB' });
      }
    } catch (err) {
      console.error('Forgot error:', err);
      Swal.fire({ icon: 'error', title: 'Kendala Jaringan', text: 'Gagal memproses lupa password.', confirmButtonColor: '#2563EB' });
    } finally {
      setLoggingIn(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetVal.password) {
      Swal.fire({ icon: 'warning', title: 'Data Kurang', text: 'Silakan ketik password baru Anda.', confirmButtonColor: '#2563EB' });
      return;
    }
    if (resetVal.password !== resetVal.confirmPassword) {
      Swal.fire({ icon: 'error', title: 'Kecocokan Gagal', text: 'Konfirmasi password baru tidak cocok.', confirmButtonColor: '#2563EB' });
      return;
    }

    setLoggingIn(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetVal.token, password: resetVal.password })
      });
      const data = await res.json();
      if (data.success) {
        setResetVal({ token: '', password: '', confirmPassword: '' });
        Swal.fire({ icon: 'success', title: 'Sukses Mengatur Ulang', text: data.message, confirmButtonColor: '#2563EB' });
        setAuthMode('login');
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal Mengatur Ulang', text: data.message, confirmButtonColor: '#2563EB' });
      }
    } catch (err) {
      console.error('Reset password error:', err);
      Swal.fire({ icon: 'error', title: 'Kendala Jaringan', text: 'Gagal memperbarui password baru di server.', confirmButtonColor: '#2563EB' });
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setToken(null);
    Swal.fire({
      icon: 'info',
      title: 'Berhasil Keluar',
      text: 'Anda telah keluar dari Portal Administrasi.',
      confirmButtonColor: '#2563EB',
      timer: 1500,
      showConfirmButton: false
    });
    navigate('/admin/login');
  };

  // Superadmin Management Actions
  const handleUpdateUserStatus = async (userId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({ icon: 'success', title: 'Status Diperbarui', text: data.message, confirmButtonColor: '#2563EB' });
        fetchAdminUsers();
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal Perbarui', text: data.message, confirmButtonColor: '#EF4444' });
      }
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Kesalahan Jaringan', text: e.message || 'Gagal terhubung dengan server.', confirmButtonColor: '#EF4444' });
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({ icon: 'success', title: 'Peran Diperbarui', text: data.message, confirmButtonColor: '#2563EB' });
        fetchAdminUsers();
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal', text: data.message, confirmButtonColor: '#EF4444' });
      }
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Kesalahan', text: e.message, confirmButtonColor: '#EF4444' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const confirmation = await Swal.fire({
      icon: 'warning',
      title: 'Hapus Pengguna',
      text: 'Semua hak akses admin ini akan dicabut secara permanen. Lanjutkan?',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#64748B'
    });

    if (!confirmation.isConfirmed) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({ icon: 'success', title: 'Dihapus', text: data.message, confirmButtonColor: '#2563EB' });
        fetchAdminUsers();
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal Menghapus', text: data.message, confirmButtonColor: '#EF4444' });
      }
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Kesalahan Jaringan', text: e.message, confirmButtonColor: '#EF4444' });
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const res = await fetch('/api/admin/backup/download', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Gagal mengunduh berkas backup.');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Backup-Cibojong1-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      Swal.fire({ icon: 'success', title: 'Unduh Berhasil', text: 'Cadangan database (.json) sukses tersimpan di komputer Anda.', confirmButtonColor: '#2563EB' });
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Backup Gagal', text: e.message, confirmButtonColor: '#EF4444' });
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const confirmRestore = await Swal.fire({
      icon: 'warning',
      title: 'Pulihkan Database?',
      text: 'Mengunggah cadangan akan menimpa data collection di database Anda. Tindakan ini tidak dapat dibatalkan. Lanjutkan?',
      showCancelButton: true,
      confirmButtonText: 'Ya, Pulihkan',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#64748B'
    });

    if (!confirmRestore.isConfirmed) return;

    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const jsonContent = evt.target?.result as string;
        const backupData = JSON.parse(jsonContent);

        const res = await fetch('/api/admin/restore', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(backupData)
        });
        const data = await res.json();
        if (data.success) {
          Swal.fire({
            icon: 'success',
            title: 'Sistem Dipulihkan',
            text: 'Data database berhasil dipulihkan secara sinkron.',
            confirmButtonColor: '#2563EB'
          });
          // Reload everything!
          fetchStats();
          fetchStudents();
          fetchAnnouncements();
          fetchGallery();
          fetchMessages();
          fetchTeachers();
          fetchAdminUsers();
        } else {
          Swal.fire({ icon: 'error', title: 'Pemulihan Gagal', text: data.message, confirmButtonColor: '#EF4444' });
        }
      } catch (err: any) {
        Swal.fire({ icon: 'error', title: 'Berkas Corrupt', text: 'Gagal memparsing berkas JSON cadangan. Pastikan berkas berformat JSON valid.', confirmButtonColor: '#EF4444' });
      } finally {
        setIsRestoring(false);
      }
    };
    reader.readAsText(file);
  };

  const handleUpdateVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    try {
      const res = await fetch(`/api/students/${selectedStudent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: verifyStatus,
          verificationComment: verifyComment
        })
      });

      if (res.status === 401) {
        handleSessionExpired();
        return;
      }

      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: 'success',
          text: 'Status pendaftar berhasil diperbarui!',
          confirmButtonColor: '#2563EB'
        });
        setSelectedStudent(null);
        fetchStudents();
        fetchStats();
      } else {
        Swal.fire({
          icon: 'error',
          text: data.message || 'Gagal mengubah status berkas.',
          confirmButtonColor: '#2563EB'
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveStudentEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    try {
      const res = await fetch(`/api/students/${selectedStudent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editStudentForm)
      });

      if (res.status === 401) {
        handleSessionExpired();
        return;
      }

      const data = await res.json();
      if (data.success) {
        Swal.fire({
          icon: 'success',
          text: 'Data pendaftar berhasil disimpan!',
          confirmButtonColor: '#2563EB'
        });
        setSelectedStudent(data.student);
        setIsEditingStudent(false);
        fetchStudents();
        fetchStats();
      } else {
        Swal.fire({
          icon: 'error',
          text: data.message || 'Gagal merubah data calon siswa.',
          confirmButtonColor: '#2563EB'
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      // Elegant timing for transition/loading feel
      await new Promise(resolve => setTimeout(resolve, 800));

      // Get date and status filtered students
      let dataToExport = [...students];
      if (filterStatus) {
        dataToExport = dataToExport.filter(s => s.status === filterStatus);
      }
      if (exportStartDate) {
        dataToExport = dataToExport.filter(s => s.createdAt && s.createdAt.substring(0, 10) >= exportStartDate);
      }
      if (exportEndDate) {
        dataToExport = dataToExport.filter(s => s.createdAt && s.createdAt.substring(0, 10) <= exportEndDate);
      }

      if (dataToExport.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'Ekspor Kosong',
          text: 'Tidak ada data calon siswa yang cocok dengan kriteria saringan ekspor.',
          confirmButtonColor: '#3b82f6'
        });
        setIsExporting(false);
        return;
      }

      // Mapping fields completely & correctly
      const rows = dataToExport.map((student, index) => {
        return {
          'No.': index + 1,
          'No. Registrasi': student.registrationNumber || '-',
          'Tanggal Daftar': student.createdAt ? new Date(student.createdAt).toLocaleDateString('id-ID') : '-',
          'Status Verifikasi': student.status || '-',
          'Catatan Verifikasi': student.verificationComment || '-',
          
          // A. IDENTITAS SISWA
          'Nama Lengkap': student.fullName || '-',
          'Nama Panggilan': student.nickname || '-',
          'Jenis Kelamin': student.gender || '-',
          'NISN': student.nisn || '-',
          'NIK Siswa': student.nik || '-',
          'Tempat Lahir': student.birthPlace || '-',
          'Tanggal Lahir': student.birthDate || '-',
          'Agama': student.religion || '-',
          'Anak Ke-': student.childNumber || student.childOrder || 1,
          'Jumlah Saudara': student.siblingCount || 0,
          'Alamat Jalan': student.address || '-',
          'RT': student.rt || '-',
          'RW': student.rw || '-',
          'Dusun': student.dusun || '-',
          'Desa / Kelurahan': student.village || '-',
          'Kecamatan': student.subdistrict || student.district || '-',
          'Kode Pos': student.postalCode || '-',
          'Tempat Tinggal': student.residenceType || student.stayType || 'Bersama Orang Tua',
          'Moda Transportasi': student.transportMode || student.transportation || 'Jalan Kaki',
          'No. Telepon/HP': student.phone || '-',
          'Sekolah Asal': student.previousSchool || '-',

          // B. DATA AYAH KANDUNG
          'Nama Ayah': student.fatherName || '-',
          'NIK Ayah': student.fatherNik || '-',
          'Agama Ayah': student.fatherReligion || '-',
          'Tempat Lahir Ayah': student.fatherBirthPlace || '-',
          'Tanggal Lahir Ayah': student.fatherBirthDate || '-',
          'Pendidikan Ayah': student.fatherEducation || '-',
          'Pekerjaan Ayah': student.fatherOccupation || '-',
          'Penghasilan Ayah': student.fatherIncome || '-',

          // C. DATA IBU KANDUNG
          'Nama Ibu': student.motherName || '-',
          'NIK Ibu': student.motherNik || '-',
          'Agama Ibu': student.motherReligion || '-',
          'Tempat Lahir Ibu': student.motherBirthPlace || '-',
          'Tanggal Lahir Ibu': student.motherBirthDate || '-',
          'Pendidikan Ibu': student.motherEducation || '-',
          'Pekerjaan Ibu': student.motherOccupation || '-',
          'Penghasilan Ibu': student.motherIncome || '-',

          // D. DATA WALI
          'Nama Wali': student.guardianName || '-',
          'NIK Wali': student.guardianNik || '-',
          'Pendidikan Wali': student.guardianEducation || '-',
          'Pekerjaan Wali': student.guardianOccupation || '-',
          'Penghasilan Wali': student.guardianIncome || '-',
          'No. WA Wali/Orang Tua': student.whatsappNumber || '-'
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Pendaftar');

      // Generate buffer & write file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const binaryData = new Blob([excelBuffer], { type: 'application/octet-stream' });
      saveAs(binaryData, 'REKAP-SPMB-2026.xlsx');

      Swal.fire({
        icon: 'success',
        title: 'Ekspor Berhasil!',
        text: `Berhasil mengunduh rekap spreadsheet Excel (${rows.length} pendaftar).`,
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    } catch (error) {
      console.error('Error exporting excel:', error);
      Swal.fire({
        icon: 'error',
        title: 'Ekspor Gagal',
        text: 'Terjadi kegagalan saat menyiapkan file laporan Excel.',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteStudent = (id: string) => {
    Swal.fire({
      title: 'Hapus Berkas?',
      text: "Data pendaftaran calon siswa ini akan dihapus permanen dari server.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(`/api/students/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.status === 401) {
            handleSessionExpired();
            return;
          }
          const data = await res.json();
          if (data.success) {
            Swal.fire('Terhapus!', 'Data pendaftaran murid telah disingkirkan.', 'success');
            fetchStudents();
            fetchStats();
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handlePublishAnn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newAnn)
      });
      if (res.status === 401) {
        handleSessionExpired();
        return;
      }
      const data = await res.json();
      if (data.success) {
        Swal.fire('Terbit', 'Pengumuman resmi berhasil diterbitkan.', 'success');
        setNewAnn({ title: '', content: '', category: 'SPMB', author: 'Tata Usaha' });
        fetchAnnouncements();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAnn = async (id: string) => {
    Swal.fire({
      title: 'Hapus Pengumuman?',
      text: 'Pengumuman luar akan dihapus permanen.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      confirmButtonText: 'Ya, Hapus'
    }).then(async (r) => {
      if (r.isConfirmed) {
        const res = await fetch(`/api/announcements/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) {
          handleSessionExpired();
          return;
        }
        const data = await res.json();
        if (data.success) {
          Swal.fire('Dihapus', 'Pengumuman telah disingkirkan.', 'success');
          fetchAnnouncements();
        }
      }
    });
  };

  const handlePublishGal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGal.imageUrl) {
      Swal.fire('Image Required', 'Harap unggah berkas gambar atau tautkan URL gambar.', 'warning');
      return;
    }
    try {
      const res = await fetch('/api/gallery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newGal)
      });
      if (res.status === 401) {
        handleSessionExpired();
        return;
      }
      const data = await res.json();
      if (data.success) {
        Swal.fire('Sukses', 'Foto baru ditambahkan ke galeri.', 'success');
        setNewGal({ title: '', description: '', imageUrl: '', category: 'Kegiatan' });
        fetchGallery();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteGal = async (id: string) => {
    Swal.fire({
      title: 'Hapus Galeri?',
      text: 'Item dokumentasi foto akan dihapus.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      confirmButtonText: 'Ya, Hapus'
    }).then(async (r) => {
      if (r.isConfirmed) {
        const res = await fetch(`/api/gallery/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) {
          handleSessionExpired();
          return;
        }
        const data = await res.json();
        if (data.success) {
          Swal.fire('Terhapus', 'Foto telah dihapus dari galeri.', 'success');
          fetchGallery();
        }
      }
    });
  };

  const handleMarkMsgRead = async (id: string) => {
    try {
      const res = await fetch(`/api/messages/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        handleSessionExpired();
        return;
      }
      const data = await res.json();
      if (data.success) {
        fetchMessages();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openVerifyPanel = (st: any) => {
    setSelectedStudent(st);
    setVerifyStatus(st.status);
    setVerifyComment(st.verificationComment || '');
    setEditStudentForm({ ...st });
    setIsEditingStudent(false);
  };

  // Clock format utilities
  const getIndonesianDateString = (date: Date) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const getIndonesianTimeString = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds} WIB`;
  };

  // Search filter
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.fullName.toLowerCase().includes(searchStudent.toLowerCase()) || 
                          (s.nisn && s.nisn.includes(searchStudent)) || 
                          s.registrationNumber.includes(searchStudent);
    const matchesStatus = filterStatus ? s.status === filterStatus : true;
    return matchesSearch && matchesStatus;
  });

  // Main UI routing layouts based on path state
  const isLoginPath = location.pathname === '/admin/login';
  const isDashboardPath = location.pathname === '/admin/dashboard';

  // 1. LOGIN / REGISTRATION / FORGOT / RESET SCREEN WORKFLOW
  if (isLoginPath || !token) {
    return (
      <div className="min-h-screen bg-[#f6f8fc] flex items-center justify-center p-4 sm:p-6 select-none font-sans relative overflow-hidden">
        {/* Absolute fluid glowing aesthetics */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-300/10 blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-300/10 blur-[120px] pointer-events-none translate-x-1/2 translate-y-1/2" />

        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-md w-full animate-fade-in"
        >
          <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-[0_20px_50px_rgba(15,23,42,0.06)] border border-slate-200/50 relative overflow-hidden">
            
            {/* Header Identity banner */}
            <div className="text-center space-y-3 mb-6">
              <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-md border border-slate-100 p-1 hover:scale-105 transition-transform duration-300">
                <img
                  src={schoolSettings.logoUrl || schoolLogo}
                  alt="Logo SDN"
                  className="h-full w-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-1.5">
                  SDN CIBOJONG 1
                </h2>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest font-mono">Portal Administrator</p>
              </div>
            </div>

            {authMode === 'login' && (
              <form onSubmit={handlePasswordLogin} id="auth_login_form" className="space-y-4">
                <div className="text-center mb-2">
                  <h3 className="text-sm font-bold text-slate-700">Masuk ke Dashboard</h3>
                  <p className="text-2xs text-slate-400">Gunakan akun administrator Anda untuk mengelola portal</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Username atau Email</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      id="login_username"
                      required
                      placeholder="admin_cibojong / admin@sdncibojong1.my.id"
                      value={loginVal.usernameOrEmail}
                      onChange={(e) => setLoginVal(prev => ({ ...prev, usernameOrEmail: e.target.value }))}
                      className="w-full h-11 pl-10.5 pr-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/55 font-medium text-xs text-slate-800 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Kata Sandi</label>
                    <button
                      type="button"
                      onClick={() => setAuthMode('forgot')}
                      className="text-[10px] font-bold text-blue-650 hover:underline cursor-pointer bg-transparent border-none outline-none p-0"
                    >
                      Lupa Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      id="login_password"
                      required
                      placeholder="••••••••"
                      value={loginVal.password}
                      onChange={(e) => setLoginVal(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full h-11 pl-10.5 pr-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/55 font-medium text-xs text-slate-800 transition-all outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  id="login_submit_btn"
                  disabled={loggingIn}
                  className="w-full h-11 bg-blue-650 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {loggingIn ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                      <span>Memverifikasi Akun...</span>
                    </>
                  ) : (
                    <span>Masuk ke Dashboard</span>
                  )}
                </button>

                <p className="text-2xs text-slate-500 text-center font-medium mt-1">
                  Belum punya akun?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('register')}
                    className="font-bold text-blue-650 hover:underline cursor-pointer bg-transparent border-none outline-none p-0"
                  >
                    Daftar Sekarang
                  </button>
                </p>
              </form>
            )}

            {authMode === 'register' && (
              <form onSubmit={handleRegisterSubmit} id="auth_register_form" className="space-y-3.5">
                <div className="text-center mb-1">
                  <h3 className="text-sm font-bold text-slate-700">Registrasi Akun Baru</h3>
                  <p className="text-2xs text-slate-400">Lengkapi data untuk mendapat akses kelola website</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Nama Lengkap</label>
                  <input
                    type="text"
                    id="reg_fullname"
                    required
                    placeholder="Nama lengkap Anda"
                    value={regVal.fullname}
                    onChange={(e) => setRegVal(prev => ({ ...prev, fullname: e.target.value }))}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/55 font-medium text-xs text-slate-800 transition-all outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Username</label>
                    <input
                      type="text"
                      id="reg_username"
                      required
                      placeholder="Contoh: admin_id"
                      value={regVal.username}
                      onChange={(e) => setRegVal(prev => ({ ...prev, username: e.target.value }))}
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/55 font-medium text-xs text-slate-800 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">No. WhatsApp</label>
                    <input
                      type="tel"
                      id="reg_phone"
                      placeholder="0812XXXXXXXX"
                      value={regVal.phone}
                      onChange={(e) => setRegVal(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/55 font-medium text-xs text-slate-800 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Alamat Email</label>
                  <input
                    type="email"
                    id="reg_email"
                    required
                    placeholder="nama@email.com"
                    value={regVal.email}
                    onChange={(e) => setRegVal(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/55 font-medium text-xs text-slate-800 transition-all outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Kata Sandi</label>
                    <input
                      type="password"
                      id="reg_password"
                      required
                      placeholder="Min. 8 karakter"
                      value={regVal.password}
                      onChange={(e) => setRegVal(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/55 font-medium text-xs text-slate-800 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Konfirmasi Sandi</label>
                    <input
                      type="password"
                      id="reg_confirm_password"
                      required
                      placeholder="Ulangi Sandi"
                      value={regVal.confirmPassword}
                      onChange={(e) => setRegVal(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/55 font-medium text-xs text-slate-800 transition-all outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  id="reg_submit_btn"
                  disabled={loggingIn}
                  className="w-full h-11 bg-blue-650 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer mt-3"
                >
                  {loggingIn ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                      <span>Memproses Akun Baru...</span>
                    </>
                  ) : (
                    <span>Daftarkan Sekarang</span>
                  )}
                </button>

                <p className="text-2xs text-slate-500 text-center font-medium mt-1">
                  Sudah punya akun?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className="font-bold text-blue-650 hover:underline cursor-pointer bg-transparent border-none outline-none p-0"
                  >
                    Masuk Sekarang
                  </button>
                </p>
              </form>
            )}

            {authMode === 'forgot' && (
              <form onSubmit={handleForgotPasswordSubmit} id="auth_forgot_form" className="space-y-4">
                <div className="text-center mb-2">
                  <h3 className="text-sm font-bold text-slate-700">Lupa Kata Sandi</h3>
                  <p className="text-2xs text-slate-400">Masukkan alamat email berelasi untuk menerima tautan akses</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Alamat Email Pendaftaran</label>
                  <input
                    type="email"
                    id="forgot_email"
                    required
                    placeholder="nama@email.com"
                    value={forgotVal.email}
                    onChange={(e) => setForgotVal({ email: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/55 font-medium text-xs text-slate-800 transition-all outline-none"
                  />
                </div>

                <button
                  type="submit"
                  id="forgot_submit_btn"
                  disabled={loggingIn}
                  className="w-full h-11 bg-blue-650 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {loggingIn ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                      <span>Mengirim Tautan...</span>
                    </>
                  ) : (
                    <span>Kirim Link Reset Sandi</span>
                  )}
                </button>

                <p className="text-2xs text-slate-500 text-center font-medium mt-1">
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className="font-bold text-blue-650 hover:underline cursor-pointer bg-transparent border-none outline-none p-0"
                  >
                    Kembali Ke Halaman Login
                  </button>
                </p>
              </form>
            )}

            {authMode === 'reset' && (
              <form onSubmit={handleResetPasswordSubmit} id="auth_reset_form" className="space-y-4">
                <div className="text-center mb-2">
                  <h3 className="text-sm font-bold text-slate-700">Atur Ulang Sandi</h3>
                  <p className="text-2xs text-slate-400">Masukkan kata sandi baru Anda dengan aman</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Token Verifikasi</label>
                  <input
                    type="text"
                    id="reset_token_input"
                    required
                    disabled
                    placeholder="Token unik Anda"
                    value={resetVal.token}
                    onChange={(e) => setResetVal(prev => ({ ...prev, token: e.target.value }))}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-205 bg-slate-100 font-bold text-xs text-slate-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Kata Sandi Baru</label>
                  <input
                    type="password"
                    id="reset_password"
                    required
                    placeholder="Min. 8 karakter"
                    value={resetVal.password}
                    onChange={(e) => setResetVal(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/55 font-medium text-xs text-slate-800 transition-all outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Konfirmasi Kata Sandi</label>
                  <input
                    type="password"
                    id="reset_confirm_password"
                    required
                    placeholder="Ulangi Sandi Baru"
                    value={resetVal.confirmPassword}
                    onChange={(e) => setResetVal(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/55 font-medium text-xs text-slate-800 transition-all outline-none"
                  />
                </div>

                <button
                  type="submit"
                  id="reset_submit_btn"
                  disabled={loggingIn}
                  className="w-full h-11 bg-blue-650 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {loggingIn ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                      <span>Mengganti Kata Sandi...</span>
                    </>
                  ) : (
                    <span>Perbarui Kata Sandi</span>
                  )}
                </button>

                <p className="text-2xs text-slate-500 text-center font-medium mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setResetVal({ token: '', password: '', confirmPassword: '' });
                      setAuthMode('login');
                    }}
                    className="font-bold text-blue-650 hover:underline cursor-pointer bg-transparent border-none outline-none p-0"
                  >
                    Batal & Kembali ke Login
                  </button>
                </p>
              </form>
            )}

            <div className="relative my-4 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <span className="relative px-3 bg-white text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                Aman & Terenkripsi
              </span>
            </div>

            <p className="text-[10px] text-slate-400 font-medium text-center leading-relaxed px-2">
              Portal ini dilindungi oleh modul keamanan database terenkripsi & session tokens.
            </p>

            <div className="pt-4 mt-4 border-t border-slate-100 text-center">
              <button 
                onClick={() => navigate('/')} 
                className="text-2xs font-bold text-slate-500 hover:text-blue-650 transition-colors uppercase tracking-wider cursor-pointer border-none bg-transparent outline-none p-0"
              >
                Kembali ke Beranda Sekolah
              </button>
            </div>

          </div>
        </motion.div>
      </div>
    );
  }

  // 2. MAIN AUTHORIZED CONTROL WORKSPACE

  return (
    <div className="min-h-screen bg-[#f6f8fc] font-sans flex flex-col lg:flex-row relative select-none">
      
      {/* A. MOBILE FLOATING HEADER */}
      <div className="lg:hidden h-16 w-full bg-white border-b border-slate-200/75 flex items-center justify-between px-6 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 bg-white border border-slate-100 p-0.5 rounded-full overflow-hidden">
            <img src={schoolSettings.logoUrl || schoolLogo} alt="" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
          </div>
          <span className="text-xs font-black text-slate-900 uppercase tracking-widest font-mono">SDN CIBOJONG 1</span>
        </div>
        
        <button
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="p-2 text-slate-700 bg-slate-50 border border-slate-150 rounded-xl"
        >
          {isMobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* B. MOBILE DRAWER SIDEBAR */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Dark overlay backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900"
            />

            {/* Sidebar drawer card layout */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-80 max-w-[85vw] h-full bg-white flex flex-col justify-between p-6 z-10 border-r border-slate-200 shadow-2xl"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={schoolSettings.logoUrl || schoolLogo} alt="" className="h-8 w-8 object-contain" referrerPolicy="no-referrer" />
                    <span className="text-[11px] font-black tracking-widest text-slate-900">CMS PANEL</span>
                  </div>
                  <button onClick={() => setIsMobileSidebarOpen(false)} className="p-1.5 hover:bg-slate-50 border rounded-lg text-slate-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Mobile Tab menus links */}
                <div className="space-y-1">
                  {navSidebarMenus.map(menu => {
                    const Icon = menu.icon;
                    const isSelected = activeTab === menu.id;
                    return (
                      <button
                        key={menu.id}
                        onClick={() => {
                          setActiveTab(menu.id as any);
                          setIsMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                          isSelected 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{menu.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mobile logout indicator */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-100 text-xs font-bold uppercase tracking-wider transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout Sesi</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* C. FIXED DESKTOP STANDBY SIDEBAR */}
      <aside className="hidden lg:flex w-72 h-screen border-r border-slate-200/70 bg-white flex-col justify-between p-6 shrink-0 sticky top-0 shadow-sm z-30">
        
        {/* Upper Sidebar Info */}
        <div className="space-y-8 flex-grow">
          {/* Brand header */}
          <div className="flex items-center space-x-3 bg-[#f8fafc]/50 p-2.5 rounded-2xl border border-slate-200/50">
            <div className="h-10 w-10 bg-white shadow-sm rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center p-0.5 font-bold shrink-0">
              <img src={schoolSettings.logoUrl || schoolLogo} alt="" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-black tracking-wider text-slate-900 uppercase truncate">SDN CIBOJONG 1</h2>
              <span className="text-[9px] font-bold text-blue-600 tracking-widest font-mono uppercase">Control Room</span>
            </div>
          </div>

          {/* Sidebar Menu items */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase block pl-4 mb-2 font-mono">Navigasi Utama</span>
            {navSidebarMenus.map(menu => {
              const Icon = menu.icon;
              const isSelected = activeTab === menu.id;
              return (
                <button
                  key={menu.id}
                  onClick={() => setActiveTab(menu.id as any)}
                  className={`w-full flex items-center justify-between px-4.5 py-3 rounded-1.5xl text-xs font-bold uppercase tracking-wider transition-all border ${
                    isSelected 
                      ? 'bg-blue-650 text-white border-blue-650 shadow-md shadow-blue-500/5 font-extrabold' 
                      : 'text-slate-650 border-transparent hover:bg-slate-50 hover:text-slate-905 hover:border-slate-150/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4.2 w-4.2 shrink-0" />
                    <span>{menu.name}</span>
                  </div>
                  {isSelected && (
                    <div className="h-1.5 w-1.5 bg-white rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lower Sidebar Actions */}
        <div className="pt-4 border-t border-slate-150/60 mt-4 space-y-3">
          
          {/* Quick return button */}
          <button 
            onClick={() => navigate('/')} 
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shrink-0"
          >
            <span>Kunjungi Web Utama</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 transition-colors text-xs font-extrabold uppercase tracking-wider"
          >
            <LogOut className="h-4 w-4" />
            <span>Keluar Sesi</span>
          </button>
        </div>

      </aside>

      {/* D. PRINCIPAL CMS CONTENT ENGINE */}
      <div className="flex-grow flex flex-col min-w-0 max-w-full">
        
        {/* DESKTOP TOP STATUS BAR */}
        <header className="hidden lg:flex h-20 border-b border-slate-200/70 bg-white items-center justify-between px-8 shrink-0 relative z-20">
          
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold font-mono px-3 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200/50">
              WORKSPACE: AKTIF
            </span>
            <div className="flex items-center gap-1.5 font-sans font-semibold text-slate-500 text-xs pl-2">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <span>{getIndonesianDateString(currentTime)}</span>
            </div>
          </div>

          {/* Digital WIB Realtime Clock and User Status */}
          <div className="flex items-center gap-6">
            
            {/* Live WIB Clock badge */}
            <div className="flex items-center gap-2.5 bg-slate-900 border border-slate-800 px-4 py-1.5 rounded-full shadow-inner shadow-black/10">
              <Clock className="h-4 w-4 text-blue-400 animate-pulse shrink-0" />
              <span className="font-bold text-blue-400 font-mono tracking-widest text-xs select-all">
                {getIndonesianTimeString(currentTime)}
              </span>
            </div>

            {/* Admin visual Profile identity status block */}
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="text-right">
                <span className="text-xs font-black text-slate-800 block">Sistem Operator</span>
                <span className="text-[10px] font-bold text-emerald-600 block flex items-center justify-end gap-1 font-mono uppercase">
                  <CircleDot className="h-1.5 w-1.5 fill-current text-current animate-pulse" />
                  <span>Petugas Aktif</span>
                </span>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 font-black text-xs font-mono shadow-sm">
                OP
              </div>
            </div>

          </div>
        </header>

        {/* INNER SCROLL CONTENT WINDOW */}
        <main className="flex-grow p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl xl:max-w-[1500px] w-full mx-auto" style={{ contentVisibility: 'auto' }}>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              
              {/* TAB 1: DASHBOARD MAIN SUMMARY */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  
                  {/* Greeting header card panel */}
                  <div className="bg-gradient-to-r from-blue-750 to-indigo-850 bg-slate-900 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-lg shadow-blue-950/20">
                    {/* Glowing effect loops */}
                    <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-white/[0.04] blur-3xl pointer-events-none translate-x-1/3 -translate-y-1/3" />
                    
                    <div className="max-w-2xl space-y-3 relative z-10">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold tracking-wider font-semibold uppercase">
                        <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span>Portal Administrasi Terpadu</span>
                      </div>
                      <h3 className="text-2xl sm:text-3.5xl font-extrabold tracking-tight leading-tight">
                        Halo, Selamat Datang Kembali di Panel Kontrol SDN Cibojong 1!
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans font-medium">
                        Sistem ini dirancang khusus untuk mempermudah petugas panitia mengelola data penerimaan siswa baru (SPMB), merilis pengumuman, mengubah foto sampul, dan menanggapi kritik & saran wali siswa secara cepat, aman, dan efisien.
                      </p>
                    </div>
                  </div>
                  {/* Core metric count list grids */}
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                    
                    {/* Card 1: Total Calon Siswa */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-200/70 shadow-[0_10px_40px_rgba(15,23,42,0.04)] hover:shadow-[0_18px_60px_rgba(15,23,42,0.08)] transition-all duration-300 flex items-center justify-between group">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block font-mono">Total Calon Siswa</span>
                        {students.length === 0 && !stats ? (
                          <div className="h-8 w-20 bg-slate-100 animate-pulse rounded-lg mt-1" />
                        ) : (
                          <span className="text-2xl sm:text-3xl font-extrabold font-mono text-blue-600 mt-1 block leading-none">
                            {stats ? stats.totalStudents : students.length}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 mt-1 block font-medium">Siswa terdaftar</span>
                      </div>
                      <div className="h-12 w-12 bg-blue-50 text-blue-600 border border-blue-100 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Users className="h-6 w-6" />
                      </div>
                    </div>

                    {/* Card 2: Menunggu Verifikasi */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-200/70 shadow-[0_10px_40px_rgba(15,23,42,0.04)] hover:shadow-[0_18px_60px_rgba(15,23,42,0.08)] transition-all duration-300 flex items-center justify-between group">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase text-amber-500 tracking-wider block font-mono">Menunggu Verifikasi</span>
                        {students.length === 0 && !stats ? (
                          <div className="h-8 w-20 bg-slate-100 animate-pulse rounded-lg mt-1" />
                        ) : (
                          <span className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-600 mt-1 block leading-none">
                            {stats ? stats.pendingStudents : students.filter(s => s.status === 'PENDING' || s.status === 'Menunggu Verifikasi').length}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 mt-1 block font-medium">Perlu ditinjau</span>
                      </div>
                      <div className="h-12 w-12 bg-amber-50 text-amber-600 border border-amber-100 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Clock className="h-6 w-6" />
                      </div>
                    </div>

                    {/* Card 3: Berkas Terverifikasi */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-200/70 shadow-[0_10px_40px_rgba(15,23,42,0.04)] hover:shadow-[0_18px_60px_rgba(15,23,42,0.08)] transition-all duration-300 flex items-center justify-between group">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase text-emerald-500 tracking-wider block font-mono">Berkas Terverifikasi</span>
                        {students.length === 0 && !stats ? (
                          <div className="h-8 w-20 bg-slate-100 animate-pulse rounded-lg mt-1" />
                        ) : (
                          <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600 mt-1 block leading-none">
                            {stats ? stats.verifiedStudents : students.filter(s => s.status === 'VERIFIED' || s.status === 'Terverifikasi').length}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 mt-1 block font-medium">Lolos kelayakan</span>
                      </div>
                      <div className="h-12 w-12 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <CheckCircle className="h-6 w-6" />
                      </div>
                    </div>

                    {/* Card 4: Kuota Terisi */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-200/70 shadow-[0_10px_40px_rgba(15,23,42,0.04)] hover:shadow-[0_18px_60px_rgba(15,23,42,0.08)] transition-all duration-300 flex items-center justify-between group">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase text-indigo-500 tracking-wider block font-mono">Kuota Terisi</span>
                        {!stats ? (
                          <div className="h-8 w-20 bg-slate-100 animate-pulse rounded-lg mt-1" />
                        ) : (
                          <span className="text-2xl sm:text-3xl font-extrabold font-mono text-indigo-650 mt-1 block leading-none">
                            {stats.quota?.registered_main || 0} <span className="text-xs text-slate-400 font-normal">/ {stats.quota?.quota_limit || 55}</span>
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 mt-1 block font-medium">Utama terisi</span>
                      </div>
                      <div className="h-12 w-12 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Layers className="h-6 w-6" />
                      </div>
                    </div>

                    {/* Card 5: Sisa Kuota */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-200/70 shadow-[0_10px_40px_rgba(15,23,42,0.04)] hover:shadow-[0_18px_60px_rgba(15,23,42,0.08)] transition-all duration-300 flex items-center justify-between group">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase text-sky-500 tracking-wider block font-mono">Sisa Kuota</span>
                        {!stats ? (
                          <div className="h-8 w-20 bg-slate-100 animate-pulse rounded-lg mt-1" />
                        ) : (
                          <span className="text-2xl sm:text-3xl font-extrabold font-mono text-sky-600 mt-1 block leading-none">
                            {stats.quota?.remaining || 0}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 mt-1 block font-medium">Alokasi siswa baru</span>
                      </div>
                      <div className="h-12 w-12 bg-sky-50 text-sky-600 border border-sky-100 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Sparkles className="h-6 w-6 animate-pulse" />
                      </div>
                    </div>

                    {/* Card 6: Pengumuman Aktif */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-200/70 shadow-[0_10px_40px_rgba(15,23,42,0.04)] hover:shadow-[0_18px_60px_rgba(15,23,42,0.08)] transition-all duration-300 flex items-center justify-between group">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block font-mono">Pengumuman Aktif</span>
                        <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-800 mt-1 block leading-none">
                          {announcements.length}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1 block font-medium">Berita tersiar</span>
                      </div>
                      <div className="h-12 w-12 bg-slate-50 text-slate-600 border border-slate-200 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Megaphone className="h-6 w-6" />
                      </div>
                    </div>

                    {/* Card 7: Kunjungan Website Hari Ini */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-200/70 shadow-[0_10px_40px_rgba(15,23,42,0.04)] hover:shadow-[0_18px_60px_rgba(15,23,42,0.08)] transition-all duration-300 flex items-center justify-between group">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase text-violet-500 tracking-wider block font-mono">Pengunjung Hari Ini</span>
                        {!stats ? (
                          <div className="h-8 w-20 bg-slate-100 animate-pulse rounded-lg mt-1" />
                        ) : (
                          <span className="text-2xl sm:text-3xl font-extrabold font-mono text-violet-650 mt-1 block leading-none">
                            {stats.analytics?.visitorsToday || 8}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 mt-1 block font-medium">Unik pengunjung</span>
                      </div>
                      <div className="h-12 w-12 bg-violet-50 text-violet-600 border border-violet-100 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Eye className="h-6 w-6" />
                      </div>
                    </div>

                  </div>

                  {/* Operational Information, Chart & Analytics Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Left & Middle: simple line chart "Pendaftaran 30 Hari Terakhir" & Pendaftar Terakhir Table */}
                    <div className="lg:col-span-2 space-y-6">
                      
                      {/* Simple line chart card */}
                      <div className="bg-white rounded-3xl border border-slate-200/70 shadow-[0_10px_40px_rgba(15,23,42,0.04)] p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Activity className="h-5 w-5 text-blue-600 shrink-0" />
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">Pendaftaran 30 Hari Terakhir</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">Grafik linear tren penambahan panitia dan pendaftar siswa baru</p>
                          </div>
                        </div>
                        
                        <div className="h-[230px] w-full">
                          {stats?.charts?.daily ? (
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                              <LineChart 
                                data={stats.charts.daily.length > 0 ? stats.charts.daily : [
                                  { date: '05-28', count: 2 },
                                  { date: '05-29', count: 5 },
                                  { date: '05-30', count: 3 },
                                  { date: '05-31', count: 8 },
                                  { date: '06-01', count: 12 },
                                  { date: '06-02', count: 10 },
                                  { date: '06-03', count: students.length || 7 }
                                ]} 
                                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10 }} allowDecimals={false} />
                                <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
                                <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={3} dot={{ fill: '#2563eb', strokeWidth: 1 }} activeDot={{ r: 6 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-slate-50 rounded-2xl border border-slate-100">
                              <span className="text-xs text-slate-400">Sedang memproses grafik data...</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Middle: Live recent registrants previews */}
                      <div className="bg-white rounded-3xl border border-slate-200/70 shadow-[0_10px_40px_rgba(15,23,42,0.04)] p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-600 shrink-0" />
                            <h4 className="font-bold text-slate-900 text-sm">Pendaftar Terakhir (Terbaru)</h4>
                          </div>
                          <button 
                            onClick={() => setActiveTab('students')}
                            className="text-[11px] font-bold text-blue-600 hover:underline uppercase tracking-wider pl-4"
                          >
                            Buka Ledger
                          </button>
                        </div>
                        
                        <div className="divide-y divide-slate-100">
                          {students.slice(0, 4).length === 0 ? (
                            <p className="text-center py-10 text-slate-400 text-xs">Belum ada murid baru mendaftar hari ini.</p>
                          ) : (
                            students.slice(0, 4).map((item, i) => (
                              <div key={item.id || i} className="py-3 flex items-center justify-between text-xs font-sans">
                                <div>
                                  <span className="font-bold text-slate-800 block text-[13px]">{item.fullName}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">Noreg: {item.registrationNumber} // Asal: {item.previousSchool}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${ item.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : item.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-orange-100 text-orange-800' }`}>
                                    {item.status}
                                  </span>
                                  <button 
                                    onClick={() => openVerifyPanel(item)}
                                    className="p-1 px-2 border border-slate-200 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-50 font-bold text-[10px]"
                                  >
                                    Detil
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Right Column: Halaman Terpopuler & Aksi Cepat */}
                    <div className="space-y-6">
                      
                      {/* Popular Pages (Analytics) Card */}
                      <div className="bg-white rounded-3xl border border-slate-200/70 shadow-[0_10px_40px_rgba(15,23,42,0.04)] p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Eye className="h-5 w-5 text-indigo-600 shrink-0" />
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">Halaman Terpopuler</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">Analisis popularitas konten real-time</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {stats?.analytics?.popularPages && stats.analytics.popularPages.length > 0 ? (
                            stats.analytics.popularPages.map((p: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-xs font-mono font-bold text-slate-400">#{idx + 1}</span>
                                  <span className="text-xs font-mono text-slate-700 truncate">{p.name}</span>
                                </div>
                                <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                  {p.count}x
                                </span>
                              </div>
                            ))
                          ) : (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-mono text-slate-700">Beranda</span>
                                <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">142x</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-mono text-slate-700">Formulir SPMB</span>
                                <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">68x</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-mono text-slate-700">Cek Status SPMB</span>
                                <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">41x</span>
                              </div>
                            </>
                          )}
                          <div className="border-t border-slate-100 pt-3 mt-1 flex justify-between text-[10px] text-slate-400 font-medium">
                            <span>Total Unique: {stats?.analytics?.totalUniqueVisitors || 154}</span>
                            <span>Bulan Ini: {stats?.analytics?.visitorsThisMonth || 94}</span>
                          </div>
                        </div>
                      </div>

                      {/* Left: Quick Actions Links shortcut list */}
                      <div className="bg-white rounded-3xl border border-slate-200/70 shadow-[0_10px_40px_rgba(15,23,42,0.04)] p-6 font-sans">
                        <div className="flex items-center gap-2 mb-4">
                          <Grid className="h-5 w-5 text-blue-600 shrink-0" />
                          <h4 className="font-bold text-slate-900 text-sm">Aksi Cepat Menu</h4>
                        </div>
                        <div className="space-y-2.5">
                          <button 
                            onClick={() => setActiveTab('students')}
                            className="w-full flex items-center justify-between p-3.5 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/20 rounded-2xl text-left transition-all group"
                          >
                            <div>
                              <span className="text-xs font-bold text-slate-800 block">Saring Verifikasi Pendaftar</span>
                              <span className="text-[10px] text-slate-400 block">Check status keaslian berkas</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                          </button>

                          <button 
                            onClick={() => setActiveTab('announcements')}
                            className="w-full flex items-center justify-between p-3.5 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/20 rounded-2xl text-left transition-all group"
                          >
                            <div>
                              <span className="text-xs font-bold text-slate-800 block">Buat Edaran Baru</span>
                              <span className="text-[10px] text-slate-400 block">Publikasikan agenda ujian SPMB</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                          </button>

                          <button 
                            onClick={() => setActiveTab('spmb_settings')}
                            className="w-full flex items-center justify-between p-3.5 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/20 rounded-2xl text-left transition-all group"
                          >
                            <div>
                              <span className="text-xs font-bold text-slate-800 block">Atur Kuota & Status SPMB</span>
                              <span className="text-[10px] text-slate-400 block font-sans">Buka/tutup formulir langsung</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      </div>

                    </div>

                  </div>

                </div>
              )}

              {/* TAB 2: DATA SISWA & FORMULIR LISTING */}
              {activeTab === 'students' && (
                <div className="space-y-6">
                  
                  {/* Ledger header summary instructions */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/70 shadow-[0_10px_40px_rgba(15,23,42,0.06)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        Ledger Pendaftar Siswa Baru (SPMB)
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-101 text-blue-700 font-bold font-mono text-[10px] uppercase">
                          {filteredStudents.length} BARIS
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 font-medium font-sans mt-0.5">
                        Halaman utama verifikasi fisik pendaftaran, koreksi biodata murid, audit KIP, dan rekapitulasi data pendaftar Excel.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                        <span className="text-[10px] text-slate-450 font-black uppercase font-mono">Dari:</span>
                        <input
                          type="date"
                          value={exportStartDate}
                          onChange={(e) => setExportStartDate(e.target.value)}
                          className="text-xs text-slate-750 bg-transparent border-none focus:outline-none focus:ring-0 p-0 font-semibold"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                        <span className="text-[10px] text-slate-450 font-black uppercase font-mono">Hingga:</span>
                        <input
                          type="date"
                          value={exportEndDate}
                          onChange={(e) => setExportEndDate(e.target.value)}
                          className="text-xs text-slate-750 bg-transparent border-none focus:outline-none focus:ring-0 p-0 font-semibold"
                        />
                      </div>
                      
                      <button
                        type="button"
                        onClick={handleExportExcel}
                        disabled={isExporting}
                        className="h-10 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-extrabold rounded-xl shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer disabled:cursor-not-allowed select-none"
                      >
                        {isExporting ? (
                          <div className="h-4.5 w-4.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <FileSpreadsheet className="h-4.5 w-4.5" />
                        )}
                        <span>{isExporting ? 'Proses...' : 'Unduh File Excel'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Searching and Status Filtering Bar */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200/70 shadow-[0_10px_40px_rgba(15,23,42,0.06)] flex flex-col md:flex-row gap-4 items-center">
                    
                    <div className="relative flex-grow w-full">
                      <Search className="absolute left-4 top-3.5 h-4.5 w-4.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Ketik kata sandi pencarian: Nama Lengkap, nomor registrasi, atau NISN murid..."
                        value={searchStudent}
                        onChange={(e) => setSearchStudent(e.target.value)}
                        className="w-full h-11 pl-11 pr-4 bg-[#f8fafc]/50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-105 transition-all text-slate-800"
                      />
                    </div>

                    <div className="w-full md:w-64">
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full h-11 px-4 bg-[#f8fafc]/50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-105"
                      >
                        <option value="">Saring Semua Status</option>
                        <option value="PENDING">PENDING (Menunggu Verifikasi)</option>
                        <option value="VERIFIED">VERIFIED (Penerimaan Sah)</option>
                        <option value="REJECTED">REJECTED (Pendaftaran Ditolak)</option>
                      </select>
                    </div>

                  </div>

                  {/* Main Desktop Responsive Matrix Table & Mobile Grid List */}
                  <div className="bg-white rounded-3xl border border-slate-200/70 shadow-[0_10px_40px_rgba(15,23,42,0.06)] overflow-hidden">
                    
                    {/* Desktop layout */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs font-sans">
                        <thead>
                          <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono border-b border-slate-200/60">
                            <th className="px-6 py-4.5">Nomor Registrasi</th>
                            <th className="px-6 py-4.5">Calon Siswa Baru</th>
                            <th className="px-6 py-4.5">NISN / NIK Siswa</th>
                            <th className="px-6 py-4.5">Tempat, Tgl Lahir</th>
                            <th className="px-6 py-4.5">Wali / HP OrangTua</th>
                            <th className="px-6 py-4.5">Kelulusan Berkas</th>
                            <th className="px-6 py-4.5 text-center">Tindakan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredStudents.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="text-center py-16 text-slate-400 font-medium font-sans">
                                Data pendaftaran pendaftar siswa baru tidak ditemukan atau kosong.
                              </td>
                            </tr>
                          ) : (
                            filteredStudents.map((st) => (
                              <tr key={st.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 font-mono font-bold text-blue-900 text-xs tracking-wider">
                                  {st.registrationNumber}
                                </td>
                                <td className="px-6 py-4">
                                  <span className="font-bold text-slate-800 text-[13px] block leading-tight">{st.fullName}</span>
                                  <span className="text-[10px] text-slate-400 font-medium uppercase mt-0.5 block">
                                    {st.gender} // Asal: {st.previousSchool || 'Tidak Ada'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-mono text-slate-650">
                                  <span className="block font-medium">NISN: {st.nisn || '-'}</span>
                                  <span className="block text-[10px] text-slate-400">NIK: {st.nik || '-'}</span>
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-700">
                                  <span className="block">{st.birthPlace}</span>
                                  <span className="text-[10px] text-slate-400 font-mono font-normal block">{st.birthDate}</span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="block font-bold text-slate-800 tracking-wide">{st.phone}</span>
                                  <span className="text-[10px] text-slate-400 block font-sans">Ayah: {st.fatherName || '-'}</span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                    st.status === 'VERIFIED' 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' 
                                      : st.status === 'REJECTED' 
                                        ? 'bg-rose-50 text-rose-700 border border-rose-150' 
                                        : 'bg-orange-50 text-orange-850 border border-orange-150'
                                  }`}>
                                    {st.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <div className="flex items-center gap-1.5 justify-center">
                                    <button
                                      onClick={() => openVerifyPanel(st)}
                                      className="px-2.5 py-1.5 bg-blue-50 border border-blue-105 hover:bg-blue-600 hover:text-white rounded-lg font-bold text-[10px] transition-colors flex items-center gap-1"
                                    >
                                      <ShieldCheck className="h-3.5 w-3.5" />
                                      <span>Verifikasi</span>
                                    </button>
                                    
                                    <a
                                      href={`/api/students/${st.id}/pdf`}
                                      className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200/55 rounded-lg text-slate-700"
                                      title="Download Kuitansi Bukti PDF"
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                    </a>

                                    <button
                                      onClick={() => handleDeleteStudent(st.id)}
                                      className="p-1.5 bg-rose-50 hover:bg-rose-250 hover:text-rose-600 rounded-lg text-rose-500 transition-all border border-rose-100"
                                      title="Hapus berkas"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile responsive card listing view */}
                    <div className="md:hidden divide-y divide-slate-100">
                      {filteredStudents.length === 0 ? (
                        <p className="text-center py-12 text-slate-400 font-medium text-xs">Data pendaftar kosong.</p>
                      ) : (
                        filteredStudents.map((st) => (
                          <div key={st.id} className="p-5 space-y-3 font-sans text-xs">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-mono font-bold text-blue-900 tracking-wider block text-xs">{st.registrationNumber}</span>
                                <h4 className="font-bold text-slate-800 text-sm leading-tight mt-0.5">{st.fullName}</h4>
                                <span className="text-[10px] text-slate-400 font-medium block">
                                  {st.gender} // Asal: {st.previousSchool || '-'}
                                </span>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                st.status === 'VERIFIED' ? 'bg-emerald-55 text-emerald-800' : st.status === 'REJECTED' ? 'bg-rose-55 text-rose-800' : 'bg-orange-55 text-orange-850'
                              }`}>
                                {st.status}
                              </span>
                            </div>

                            <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-150/40 space-y-1 font-sans">
                              <p className="text-slate-600 font-medium"><strong>Tempat/Tgl Lahir:</strong> {st.birthPlace}, {st.birthDate}</p>
                              <p className="text-slate-650"><strong>NISN:</strong> {st.nisn || '-'}</p>
                              <p className="text-slate-650"><strong>HP Orang Tua:</strong> {st.phone}</p>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => openVerifyPanel(st)}
                                className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold text-[10px] uppercase text-center flex items-center justify-center gap-1 shadow-sm"
                              >
                                <ShieldCheck className="h-3.5 w-3.5" />
                                <span>Koreksi & Verifikasi</span>
                              </button>
                              <a
                                href={`/api/students/${st.id}/pdf`}
                                className="px-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 flex items-center justify-center border border-slate-200"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                              <button
                                onClick={() => handleDeleteStudent(st.id)}
                                className="px-3 bg-rose-50 text-rose-600 rounded-lg border border-rose-100 flex items-center justify-center"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                  </div>

                </div>
              )}

              {/* TAB 3: MANAGE ANNOUNCEMENTS */}
              {activeTab === 'announcements' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
                  
                  {/* Left: Input box form to publish announcement */}
                  <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/70 shadow-[0_10px_40px_rgba(15,23,42,0.06)] space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-2">
                      <Megaphone className="h-5 w-5 text-blue-600" />
                      <h3 className="font-bold text-slate-800 text-sm">Terbitkan Edaran Resmi</h3>
                    </div>

                    <form onSubmit={handlePublishAnn} className="space-y-4 font-sans text-xs">
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700 uppercase tracking-wider block">Judul Informasi</label>
                        <input
                          type="text"
                          value={newAnn.title}
                          onChange={(e) => setNewAnn(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Contoh: Pengumuman hasil tes fisik SPMB Gelombang 1..."
                          className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-blue-105"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700 uppercase tracking-wider block">Kategori Edaran</label>
                        <select
                          value={newAnn.category}
                          onChange={(e) => setNewAnn(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full h-11 border border-slate-200 rounded-xl px-3.5 font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-blue-105"
                        >
                          <option value="SPMB">SPMB / Pendaftaran Baru</option>
                          <option value="Akademik">Akademik Sekolah</option>
                          <option value="Kegiatan">Ekstrakurikuler / Kegiatan</option>
                          <option value="Umum">Informasi Umum</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700 uppercase tracking-wider block">Konten / Ringkasan Keterangan</label>
                        <textarea
                          value={newAnn.content}
                          onChange={(e) => setNewAnn(prev => ({ ...prev, content: e.target.value }))}
                          placeholder="Masukkan rincian informasi dewan guru, batas tanggal bayar ulang, atau agenda operasional di sini..."
                          rows={6}
                          className="w-full border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-blue-105 leading-relaxed"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-600 text-white font-extrabold py-3 rounded-full flex items-center justify-center gap-1.5 shadow shadow-blue-500/10 text-xs tracking-wider uppercase hover:scale-[1.01] active:scale-[0.99] transition-all"
                      >
                        <Plus className="h-4.5 w-4.5" />
                        <span>Terbitkan Sekarang</span>
                      </button>
                    </form>
                  </div>

                  {/* Right: Existing listing bulletins */}
                  <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/70 shadow-[0_10px_40px_rgba(15,23,42,0.06)] space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                      <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider font-sans">Daftar Edaran Berjalan</h3>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-855 font-bold font-mono text-[10px] rounded border border-slate-200/50 uppercase">
                        {announcements.length} BERITA
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-2">
                      {announcements.length === 0 ? (
                        <p className="text-center py-14 text-slate-400 font-medium">Belum ada pengumuman yang diterbitkan sekolah.</p>
                      ) : (
                        announcements.map((ann) => (
                          <div key={ann.id} className="py-4.5 flex justify-between items-start gap-4">
                            <div className="space-y-1.5 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[9px] bg-blue-100 text-blue-900 px-20 px-2 py-0.5 rounded font-black uppercase tracking-wider">{ann.category}</span>
                                <span className="text-[10px] text-slate-400 font-mono font-bold flex items-center gap-1">
                                  <Calendar className="h-3 w-3 inline" />
                                  {ann.date}
                                </span>
                              </div>
                              <h4 className="font-extrabold text-slate-900 text-sm sm:text-[15px] leading-tight">{ann.title}</h4>
                              <p className="text-slate-600 leading-relaxed font-sans font-medium line-clamp-3">{ann.content}</p>
                            </div>
                            <button
                              onClick={() => handleDeleteAnn(ann.id)}
                              className="p-1.5 h-8 w-8 bg-rose-50 text-rose-600 hover:bg-rose-250 hover:text-rose-700 transition-all border border-rose-100 rounded-lg shrink-0 flex items-center justify-center cursor-pointer"
                              title="Hapus pengumuman ini"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 4: KELOLA GURU DEWAN STAFF */}
              {activeTab === 'teachers' && (
                <div className="bg-white rounded-3xl border border-slate-200/70 shadow-[0_10px_40px_rgba(15,23,42,0.06)] overflow-hidden">
                  
                  <div className="p-6 border-b border-slate-150/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 tracking-tight">SDN Cibojong 1 Staffing Console</h3>
                      <p className="text-xs text-slate-500 font-medium font-sans mt-0.5">
                        Kelola data dewan guru, foto berseragam resmi, jenjang kepangkatan (Role), serta simpan langsung ke database utama.
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-105 font-mono text-xs font-black uppercase">
                      Total Staff: {teachers.length} Orang
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-sans">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono border-b border-slate-100">
                          <th className="px-6 py-4.5 w-32">Pas Foto</th>
                          <th className="px-6 py-4.5">Nama Lengkap Guru / Pegawai</th>
                          <th className="px-6 py-4.5 w-60">Status Jabatan (Role)</th>
                          <th className="px-6 py-4.5 w-48">Kategori</th>
                          <th className="px-6 py-4.5 text-center w-64">Aksi / Update</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {teachers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-16 text-center text-slate-400 font-medium">Data Guru Kosong.</td>
                          </tr>
                        ) : (
                          teachers.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-50/50 transition-all">
                              <td className="px-6 py-4">
                                <div className="relative w-12 aspect-[2/3] rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-slate-100 flex items-center justify-center p-0.5">
                                  <img 
                                    src={t.photoUrl || (t.role === 'Kepala Sekolah' ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=300' : (t.role === 'TAS/OPS' || t.name.includes('Yanto') || t.name.includes('Deden') || t.name.includes('Shofan') ? 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=300' : 'https://images.unsplash.com/photo-1580894732444-8febeb78ec3e?q=80&w=300'))}
                                    alt={t.name}
                                    className="h-full w-full object-cover rounded"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <input
                                  type="text"
                                  value={t.name || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setTeachers(prev => prev.map(item => item.id === t.id ? { ...item, name: val } : item));
                                  }}
                                  className="w-full h-10 px-3 bg-white border border-slate-200 focus:ring-4 focus:ring-blue-105 focus:border-blue-500 rounded-xl text-xs font-bold text-slate-800 transition-all"
                                />
                              </td>
                              <td className="px-6 py-4">
                                <input
                                  type="text"
                                  value={t.role || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setTeachers(prev => prev.map(item => item.id === t.id ? { ...item, role: val } : item));
                                  }}
                                  className="w-full h-10 px-3 bg-white border border-slate-200 focus:ring-4 focus:ring-blue-105 focus:border-blue-500 rounded-xl text-xs font-mono font-semibold text-slate-705 transition-all"
                                />
                              </td>
                              <td className="px-6 py-4">
                                <select
                                  value={t.category || 'Guru'}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setTeachers(prev => prev.map(item => item.id === t.id ? { ...item, category: val } : item));
                                  }}
                                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blue-105 focus:border-blue-500 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                                >
                                  <option value="Guru">Guru Tetap</option>
                                  <option value="Staf">Staf Tata Usaha</option>
                                  <option value="Tendik">Tenaga Kependidikan</option>
                                </select>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex flex-col gap-1.5 items-stretch max-w-[150px] mx-auto">
                                  
                                  {/* Pas Foto Upload label */}
                                  <label className="bg-blue-600 hover:bg-blue-500 hover:scale-[1.01] active:scale-[0.99] rounded-lg text-white font-bold py-1.5 px-3 text-[10px] uppercase text-center cursor-pointer transition-all inline-flex items-center justify-center gap-1 shrink-0">
                                    <Camera className="h-3 w-3 shrink-0" />
                                    <span>Ganti Pas Foto</span>
                                    <input
                                      type="file"
                                      accept="image/png, image/jpeg, image/jpg"
                                      className="hidden"
                                      onChange={async (e) => {
                                        if (e.target.files && e.target.files[0]) {
                                          const file = e.target.files[0];
                                          if (!file.type.match('image/png') && !file.type.match('image/jpeg')) {
                                            Swal.fire({ icon: 'error', text: 'Format tidak didukung. Harap pilih gambar JPEG atau PNG.', confirmButtonColor: '#EF4444' });
                                            return;
                                          }

                                          const formData = new FormData();
                                          formData.append('photo', file);

                                          Swal.fire({
                                            title: 'Mengunggah...',
                                            allowOutsideClick: false,
                                            didOpen: () => { Swal.showLoading(); }
                                          });

                                          try {
                                            const rUpload = await fetch(`/api/teachers/${t.id}/image`, {
                                              method: 'POST',
                                              headers: { 'Authorization': `Bearer ${token}` },
                                              body: formData
                                            });
                                            if (rUpload.status === 401) {
                                              handleSessionExpired();
                                              return;
                                            }
                                            const dUpload = await rUpload.json();
                                            if (dUpload.success) {
                                              Swal.fire('Sukses', 'Pas foto dewan guru berhasil tersimpan!', 'success');
                                              fetchTeachers();
                                            } else {
                                              Swal.fire('Gagal', dUpload.message || 'Gagal menyimpan.', 'error');
                                            }
                                          } catch (err) {
                                            console.error(err);
                                          }
                                        }
                                      }}
                                    />
                                  </label>

                                  {/* PUT Save text properties details action */}
                                  <button
                                    onClick={async () => {
                                      try {
                                        const res = await fetch(`/api/teachers/${t.id}`, {
                                          method: 'PUT',
                                          headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${token}`
                                          },
                                          body: JSON.stringify({
                                            name: t.name,
                                            role: t.role,
                                            category: t.category
                                          })
                                        });

                                        if (res.status === 401) {
                                          handleSessionExpired();
                                          return;
                                        }

                                        const data = await res.json();
                                        if (data.success) {
                                          Swal.fire({
                                            icon: 'success',
                                            text: 'Keterangan guru sukses diperbarui!',
                                            confirmButtonColor: '#2563EB',
                                            timer: 1500,
                                            showConfirmButton: false
                                          });
                                          fetchTeachers();
                                        } else {
                                          Swal.fire('Gagal', data.message || 'Gagal.', 'error');
                                        }
                                      } catch (err) {
                                        console.error(err);
                                      }
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-500 hover:scale-[1.01] active:scale-[0.99] rounded-lg text-white font-bold py-1.5 px-3 text-[10px] uppercase text-center transition-all inline-flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                                  >
                                    <CheckCircle className="h-3 w-3 shrink-0" />
                                    <span>Simpan Biodata</span>
                                  </button>

                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

              {/* TAB 5: MANAGE GALLERY */}
              {activeTab === 'gallery' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
                  
                  {/* Left: adding gallery photo form */}
                  <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/70 shadow-[0_10px_40px_rgba(15,23,42,0.06)] space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-2 font-sans">
                      <ImageIcon className="h-5 w-5 text-blue-600" />
                      <h3 className="font-bold text-slate-800 text-sm">Masukan Foto Galeri Baru</h3>
                    </div>

                    <form onSubmit={handlePublishGal} className="space-y-4 font-sans text-xs">
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700 uppercase tracking-wider block">Keterangan Foto (Caption)</label>
                        <input
                          type="text"
                          value={newGal.title}
                          onChange={(e) => setNewGal(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Kegiatan pramuka berkemah..."
                          className="w-full h-11 border border-slate-200 rounded-xl px-3.5 text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-blue-105"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700 uppercase tracking-wider block">Kategori Pemisahan</label>
                        <select
                          value={newGal.category}
                          onChange={(e) => setNewGal(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full h-11 border border-slate-200 rounded-xl px-3.5 font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-blue-105"
                        >
                          <option value="Kegiatan">Kegiatan Ekstrakurikuler/Belajar</option>
                          <option value="Fasilitas">Fasilitas & Lingkungan Gedung</option>
                          <option value="Prestasi">Juara & Prestasi Siswa</option>
                          <option value="Belajar">Pembelajaran / Kelas</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700 uppercase tracking-wider block">Unggah Berkas Gambar (PNG/JPG)</label>
                        
                        <div className="space-y-2">
                          <label className="h-20 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer text-slate-600 font-bold transition-all relative">
                            <Plus className="h-5 w-5 text-slate-400 shrink-0" />
                            <span className="text-[11px]">Cari & Upload Foto Dari Device</span>
                            <input
                              type="file"
                              accept="image/png, image/jpeg"
                              className="hidden"
                              onChange={async (e) => {
                                if (e.target.files && e.target.files[0]) {
                                  const file = e.target.files[0];
                                  if (!file.type.match('image/png') && !file.type.match('image/jpeg')) {
                                    Swal.fire({ icon: 'error', text: 'Format tidak didukung. Sila gunakan JPG atau PNG.', confirmButtonColor: '#EF4444' });
                                    return;
                                  }

                                  const formData = new FormData();
                                  formData.append('photo', file);

                                  Swal.fire({
                                    title: 'Mengunggah...',
                                    allowOutsideClick: false,
                                    didOpen: () => { Swal.showLoading(); }
                                  });

                                  try {
                                    const rUpload = await fetch('/api/gallery/upload', {
                                      method: 'POST',
                                      headers: { 'Authorization': `Bearer ${token}` },
                                      body: formData
                                    });
                                    if (rUpload.status === 401) {
                                      handleSessionExpired();
                                      return;
                                    }
                                    const dUpload = await rUpload.json();
                                    if (dUpload.success) {
                                      setNewGal(prev => ({ ...prev, imageUrl: dUpload.imageUrl }));
                                      Swal.fire('Sukses', 'Gambar galeri terekam di sistem draft.', 'success');
                                    } else {
                                      Swal.fire('Gagal', dUpload.message, 'error');
                                    }
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }
                              }}
                            />
                          </label>

                          <div className="text-[10px] text-slate-400 italic">
                            Atau masukkan manual tautan link ilustrasi eksternal:
                          </div>
                          <input
                            type="text"
                            value={newGal.imageUrl}
                            onChange={(e) => setNewGal(prev => ({ ...prev, imageUrl: e.target.value }))}
                            placeholder="https://images.unsplash.com/photo-..."
                            className="w-full h-10 border border-slate-200 rounded-xl px-3 font-mono text-[10px]"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-600 text-white font-extrabold h-12 rounded-full flex items-center justify-center gap-1.5 mt-2 shadow uppercase tracking-wider text-xs"
                      >
                        <Plus className="h-4.5 w-4.5" />
                        <span>Simpan Ke Album</span>
                      </button>
                    </form>
                  </div>

                  {/* Right: Existing visual grid lists */}
                  <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/70 shadow-[0_10px_40px_rgba(15,23,42,0.06)] space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2 font-sans">
                      <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Album Berjalan</h3>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold font-mono text-[10px] rounded uppercase">
                        {gallery.length} FOTO
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[520px] overflow-y-auto pr-1">
                      {gallery.length === 0 ? (
                        <p className="col-span-2 text-center py-12 text-slate-400 font-medium">Belum ada album foto.</p>
                      ) : (
                        gallery.map((g) => (
                          <div key={g.id} className="border border-slate-150 rounded-2xl overflow-hidden p-2 bg-slate-50/40 relative flex gap-3 group">
                            <div className="h-16 aspect-video bg-white border border-slate-200 rounded-lg overflow-hidden shrink-0">
                              <img src={g.imageUrl} alt="" className="h-full w-full object-cover rounded shadow-inner" referrerPolicy="no-referrer" />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-800 font-mono text-[8px] font-black rounded uppercase tracking-wider block inline-block">{g.category}</span>
                              <h4 className="font-bold text-slate-900 text-xs truncate leading-tight block">{g.title || 'Tanpa Judul'}</h4>
                            </div>
                            <button
                              onClick={() => handleDeleteGal(g.id)}
                              className="absolute bottom-2 right-2 p-1.5 bg-rose-50 text-rose-600 rounded-lg border border-rose-100"
                              title="Hapus gambar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 6: CONTACT INBOX MESSAGES */}
              {activeTab === 'messages' && (
                <div className="bg-white rounded-3xl border border-slate-200/70 shadow-[0_10px_40px_rgba(15,23,42,0.06)] overflow-hidden">
                  
                  <div className="p-6 border-b border-slate-150/70">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">Kritik & Saran Masuk Wali Siswa</h3>
                    <p className="text-xs text-slate-500 font-medium font-sans mt-0.5">
                      Daftar pesan saran dari calon wali siswa sekolah SDN Cibojong 1 yang dikirim melalui halaman Hubungi Kami.
                    </p>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {messages.length === 0 ? (
                      <p className="text-center py-16 text-slate-400 font-medium text-xs">Belum ada pengaduan harian masuk.</p>
                    ) : (
                      messages.map((m) => (
                        <div key={m.id} className={`p-6 flex items-start justify-between gap-5 transition-all ${m.isRead ? 'bg-white opacity-75' : 'bg-blue-50/15'}`}>
                          <div className="space-y-2 flex-grow max-w-4xl font-sans">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-slate-800 text-sm block">{m.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono font-medium block">&lt;{m.email}&gt;</span>
                              <span className="text-[10.5px] text-slate-450 font-mono font-bold block">{m.date}</span>
                            </div>
                            <h4 className="font-bold text-blue-900 leading-snug">{m.subject || 'Konfirmasi pendaftaran'}</h4>
                            <p className="text-slate-650 leading-relaxed text-xs leading-normal">{m.message}</p>
                          </div>

                          <div className="shrink-0 pl-2">
                            {!m.isRead ? (
                              <button
                                onClick={() => handleMarkMsgRead(m.id)}
                                className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-100 hover:bg-emerald-600 hover:text-white rounded-lg font-bold text-[10px] flex items-center gap-1.5 transition-all"
                              >
                                <Check className="h-3.5 w-3.5 shrink-0" />
                                <span>Tandai Selesai Dibaca</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono font-extrabold flex items-center gap-1">
                                <CheckCircle className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span>SUDAH DIBACA</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                </div>
              )}

              {/* TAB 7: PRINCIPAL WEBSITE SETTINGS */}
              {activeTab === 'settings' && (
                <div className="bg-white rounded-3xl border border-slate-200/70 shadow-[0_10px_40px_rgba(15,23,42,0.06)] overflow-hidden">
                  
                  <div className="p-6 border-b border-slate-150/70">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">Kustomisasi Halaman & Desain Visual</h3>
                    <p className="text-xs text-slate-500 font-medium font-sans mt-0.5">
                      Personalisasi foto sampul utama pendaftaran, sampul halaman profil sekolah, serta lambang resmi logo institusi.
                    </p>
                  </div>

                  <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 font-sans">
                    
                    {/* A. LOGO SEKOLAH CARD */}
                    <div className="border border-slate-150 rounded-2xl p-5 bg-slate-50/50 flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Layers className="h-5 w-5 text-blue-600" />
                          <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm">Logo Resmi Sekolah</h4>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col items-center justify-center gap-3">
                          <div className="h-28 w-28 bg-white rounded-full border border-slate-100 shadow p-1 overflow-hidden flex items-center justify-center">
                            <img src={schoolSettings.logoUrl || schoolLogo} alt="" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                          </div>
                          <span className="text-[10px] text-slate-405 font-mono truncate max-w-full select-all">
                            {schoolSettings.logoUrl || 'assets/school_logo.png'}
                          </span>
                        </div>
                      </div>

                      <label className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow">
                        <Camera className="h-4.5 w-4.5 shrink-0" />
                        <span>Ganti Lambang Logo</span>
                        <input
                          type="file"
                          accept="image/png, image/jpeg"
                          className="hidden"
                          onChange={async (e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              if (!file.type.match('image/png') && !file.type.match('image/jpeg')) {
                                Swal.fire({ icon: 'error', text: 'Format tidak didukung. Sila pasang berkas gambar PNG atau JPG.', confirmButtonColor: '#EF4444' });
                                return;
                              }

                              const formData = new FormData();
                              formData.append('photo', file);

                              Swal.fire({ title: 'Ganti logo...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                              try {
                                const rUpload = await fetch('/api/settings/logo', {
                                  method: 'POST',
                                  headers: { 'Authorization': `Bearer ${token}` },
                                  body: formData
                                });
                                if (rUpload.status === 401) {
                                  handleSessionExpired();
                                  return;
                                }
                                const dUpload = await rUpload.json();
                                if (dUpload.success) {
                                  Swal.fire('Sukses', 'Logo resmi sekolah berhasil diubah!', 'success');
                                  fetchSchoolSettings();
                                }
                              } catch (err) {
                                console.error(err);
                              }
                            }
                          }}
                        />
                      </label>
                    </div>

                    {/* B. HERO REGISTER BANNERS */}
                    <div className="border border-slate-150 rounded-2xl p-5 bg-slate-50/50 flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-5 w-5 text-blue-600" />
                          <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm">Sampul Hero Utama</h4>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col gap-2">
                          <div className="h-28 aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-100">
                            <img src={schoolSettings.coverUrl || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=600'} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <span className="text-[10px] text-slate-405 font-mono truncate max-w-full select-all">
                            {schoolSettings.coverUrl || 'Default Unsplash'}
                          </span>
                        </div>
                      </div>

                      <label className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow">
                        <Camera className="h-4.5 w-4.5 shrink-0" />
                        <span>Ganti Foto Sampul</span>
                        <input
                          type="file"
                          accept="image/png, image/jpeg"
                          className="hidden"
                          onChange={async (e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              if (!file.type.match('image/png') && !file.type.match('image/jpeg')) {
                                Swal.fire({ icon: 'error', text: 'Format tidak didukung. Sila pasang berkas gambar!', confirmButtonColor: '#EF4444' });
                                return;
                              }

                              const formData = new FormData();
                              formData.append('photo', file);

                              Swal.fire({ title: 'Ganti sampul...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                              try {
                                const rUpload = await fetch('/api/settings/cover', {
                                  method: 'POST',
                                  headers: { 'Authorization': `Bearer ${token}` },
                                  body: formData
                                });
                                if (rUpload.status === 401) {
                                  handleSessionExpired();
                                  return;
                                }
                                const dUpload = await rUpload.json();
                                if (dUpload.success) {
                                  Swal.fire('Sukses', 'Foto sampul pendaftaran utama berhasil diubah!', 'success');
                                  fetchSchoolSettings();
                                }
                              } catch (err) {
                                console.error(err);
                              }
                            }
                          }}
                        />
                      </label>
                    </div>

                    {/* C. PROFILE BANNERS COVERS */}
                    <div className="border border-slate-150 rounded-2xl p-5 bg-slate-50/50 flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-5 w-5 text-blue-600" />
                          <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm">Sampul Profil Sekolah</h4>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col gap-2">
                          <div className="h-28 aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-105">
                            <img src={schoolSettings.profileCoverUrl || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=600'} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <span className="text-[10px] text-slate-405 font-mono truncate max-w-full select-all">
                            {schoolSettings.profileCoverUrl || 'Default Unsplash'}
                          </span>
                        </div>
                      </div>

                      <label className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow">
                        <Camera className="h-4.5 w-4.5 shrink-0" />
                        <span>Ganti Sampul Profil</span>
                        <input
                          type="file"
                          accept="image/png, image/jpeg"
                          className="hidden"
                          onChange={async (e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              if (!file.type.match('image/png') && !file.type.match('image/jpeg')) {
                                Swal.fire({ icon: 'error', text: 'Format tidak didukung. Sila pasang berkas gambar!', confirmButtonColor: '#EF4444' });
                                return;
                              }

                              const formData = new FormData();
                              formData.append('photo', file);

                              Swal.fire({ title: 'Ganti sampul...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                              try {
                                const rUpload = await fetch('/api/settings/profile-cover', {
                                  method: 'POST',
                                  headers: { 'Authorization': `Bearer ${token}` },
                                  body: formData
                                });
                                if (rUpload.status === 401) {
                                  handleSessionExpired();
                                  return;
                                }
                                const dUpload = await rUpload.json();
                                if (dUpload.success) {
                                  Swal.fire('Sukses', 'Foto sampul halaman profil berhasil diperbarui!', 'success');
                                  fetchSchoolSettings();
                                }
                              } catch (err) {
                                console.error(err);
                              }
                            }
                          }}
                        />
                      </label>
                    </div>

                    {/* D. STATUS PENDAFTARAN PPDB */}
                    <div className="border border-slate-150 rounded-2xl p-5 bg-slate-50/50 flex flex-col justify-between space-y-4">
                      <div className="space-y-3 font-sans">
                        <div className="flex items-center gap-2">
                          <Lock className="h-5 w-5 text-blue-600" />
                          <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm">Status Pendaftaran (PPDB)</h4>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col items-center justify-center gap-3">
                          <div className={`h-16 w-16 rounded-full flex items-center justify-center text-white ${schoolSettings.isRegistrationClosed ? 'bg-rose-500 shadow-[0_4px_12px_rgba(244,63,94,0.3)]' : 'bg-emerald-500 shadow-[0_4px_12px_rgba(16,185,129,0.3)]'}`}>
                            {schoolSettings.isRegistrationClosed ? (
                              <Lock className="h-8 w-8" />
                            ) : (
                              <CheckCircle className="h-8 w-8" />
                            )}
                          </div>
                          <div className="text-center">
                            <span className={`text-[10px] sm:text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${schoolSettings.isRegistrationClosed ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {schoolSettings.isRegistrationClosed ? 'Pendaftaran Ditutup' : 'Pendaftaran Dibuka'}
                            </span>
                            <p className="text-[10px] text-slate-400 mt-2 font-medium leading-relaxed">
                              {schoolSettings.isRegistrationClosed 
                                ? 'Wali murid TIDAK BISA mengisi form PPDB.' 
                                : 'Formulir PPDB aktif menerima pendaftar.'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          const newStatus = !schoolSettings.isRegistrationClosed;
                          const actionText = newStatus ? 'menutup' : 'membuka kembali';
                          const confirmResult = await Swal.fire({
                            title: `Apakah Anda yakin?`,
                            text: `Anda akan ${actionText} formulir pendaftaran SPMB online SDN Cibojong 1.`,
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: newStatus ? '#ef4444' : '#10b981',
                            cancelButtonColor: '#64748b',
                            confirmButtonText: `Ya, ${newStatus ? 'Tutup' : 'Buka'} Pendaftaran`,
                            cancelButtonText: 'Batal'
                          });

                          if (confirmResult.isConfirmed) {
                            Swal.fire({ title: 'Mengeksekusi tindakan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                            try {
                              const res = await fetch('/api/settings/info', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                  isRegistrationClosed: newStatus
                                })
                              });
                              if (res.status === 401) {
                                  handleSessionExpired();
                                return;
                              }
                              const data = await res.json();
                              if (data.success) {
                                Swal.fire({
                                  icon: 'success',
                                  title: 'Berhasil',
                                  text: `Formulir pendaftaran sekarang resmi ${newStatus ? 'ditutup' : 'dibuka'}!`,
                                  toast: true,
                                  position: 'top-end',
                                  showConfirmButton: false,
                                  timer: 3000
                                });
                                fetchSchoolSettings();
                              }
                            } catch (err) {
                              console.error(err);
                              Swal.fire('Error', 'Tindakan gagal diproses server.', 'error');
                            }
                          }
                        }}
                        className={`w-full h-11 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl transition-all shadow ${
                          schoolSettings.isRegistrationClosed 
                            ? 'bg-emerald-600 hover:bg-emerald-500' 
                            : 'bg-rose-600 hover:bg-rose-500'
                        }`}
                      >
                        {schoolSettings.isRegistrationClosed ? 'Buka Pendaftaran' : 'Tutup Pendaftaran'}
                      </button>
                    </div>

                  </div>

                  {/* Keterangan title inputs */}
                  <div className="p-6 border-t border-slate-100 bg-slate-50/20">
                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                        try {
                          const res = await fetch('/api/settings/info', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                              coverTitle: coverTitleInput,
                              coverSubtitle: coverSubtitleInput
                            })
                          });
                          if (res.status === 401) {
                            handleSessionExpired();
                            return;
                          }
                          const data = await res.json();
                          if (data.success) {
                            Swal.fire('Berhasil', 'Keterangan sampul visual disimpan!', 'success');
                            fetchSchoolSettings();
                          }
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="space-y-4 max-w-2xl font-sans"
                    >
                      <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm uppercase tracking-wider block">Keterangan Judul Sampul</h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Judul Sampul Utama</label>
                          <input
                            type="text"
                            value={coverTitleInput}
                            onChange={(e) => setCoverTitleInput(e.target.value)}
                            placeholder="Gedung Utama Cibojong 1"
                            className="w-full h-11 border border-slate-200 rounded-xl px-3 font-semibold text-slate-850 text-xs focus:ring-2 focus:ring-blue-105"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Sub-Judul Sampul</label>
                          <input
                            type="text"
                            value={coverSubtitleInput}
                            onChange={(e) => setCoverSubtitleInput(e.target.value)}
                            placeholder="Padarincang, Serang"
                            className="w-full h-11 border border-slate-200 rounded-xl px-3 font-semibold text-slate-850 text-xs focus:ring-2 focus:ring-blue-105"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold h-11 px-6 rounded-xl transition-all shadow text-2xs uppercase tracking-wider block"
                      >
                        Simpan Keterangan Teks
                      </button>
                    </form>
                  </div>

                </div>
              )}

              {/* TAB 8: SPMB QUANTITATIVE & TIMEFRAME CONFIGS */}
              {activeTab === 'spmb_settings' && (
                <div className="bg-white rounded-3xl border border-slate-200/70 shadow-[0_10px_40px_rgba(15,23,42,0.06)] overflow-hidden">
                  
                  <div className="p-6 border-b border-slate-150/70">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-blue-600" />
                      Konfigurasi & Manajemen Sistem SPMB 2026/2027
                    </h3>
                    <p className="text-xs text-slate-500 font-medium font-sans mt-0.5">
                      Kelola jadwal operasional, persentase keterisian kuota primer, sisa kuota saat ini, serta kendali waiting list otomatis.
                    </p>
                  </div>

                  <div className="p-6 sm:p-8 space-y-8 font-sans">
                    
                    {/* Visual Quota Progress meter / tracker banner */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-150 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-1.5 max-w-md">
                        <span className="text-[10px] font-black tracking-wider uppercase text-blue-300 bg-blue-600 px-2.5 py-0.5 rounded-full inline-block">Status Keterisian Kuota</span>
                        <h4 className="text-sm font-extrabold text-slate-800">Kuota Terdaftar versus Daya Tampung Kelas</h4>
                        <p className="text-[11px] text-slate-550 leading-relaxed font-sans font-medium">
                          Jumlah siswa terverifikasi saat ini digunakan secara ketat sebagai limitasi proteksi ketika administrator memangkas atau memperluas volume pendaftaran.
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <span className="text-[10px] text-slate-400 font-black tracking-wider uppercase block">Terverifikasi</span>
                          <span className="text-2.5xl font-mono font-extrabold text-emerald-600 mt-0.5 block leading-none">
                            {students.filter((s: any) => s && (s.status === 'VERIFIED' || s.status === 'Terverifikasi')).length}
                          </span>
                        </div>
                        <div className="h-8 w-[1px] bg-slate-250" />
                        <div className="text-center">
                          <span className="text-[10px] text-slate-400 font-black tracking-wider uppercase block">Total Kuota</span>
                          <span className="text-2.5xl font-mono font-extrabold text-slate-800 mt-0.5 block leading-none">
                            {spmbSettings?.quota_limit || 55}
                          </span>
                        </div>
                        <div className="h-8 w-[1px] bg-slate-250" />
                        <div className="text-center">
                          <span className="text-[10px] text-slate-400 font-black tracking-wider uppercase block">Sisa Kuota</span>
                          <span className="text-2.5xl font-mono font-extrabold text-blue-600 mt-0.5 block leading-none">
                            {stats?.quota?.remaining !== undefined ? stats.quota.remaining : (Number(spmbSettings?.quota_limit || 55) - students.filter((s: any) => s && (s.status === 'VERIFIED' || s.status === 'Terverifikasi')).length)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Main config Form */}
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        const target = e.currentTarget;
                        const fd = new FormData(target);
                        const openDate = fd.get('registration_open') as string;
                        const closeDate = fd.get('registration_close') as string;
                        const quotaLimit = Number(fd.get('quota_limit'));
                        const registrationActive = fd.get('registration_active') === 'true';
                        const waitingListEnabled = fd.get('waiting_list_enabled') === 'true';

                        handleSpmbSubmit({
                          registration_open: openDate,
                          registration_close: closeDate,
                          quota_limit: quotaLimit,
                          registration_active: registrationActive,
                          waiting_list_enabled: waitingListEnabled
                        });
                      }}
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* 1. Date Buka */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Tanggal Buka Pendaftaran</label>
                          <input 
                            name="registration_open"
                            type="date"
                            required
                            defaultValue={spmbSettings?.registration_open || "2026-06-01"}
                            className="w-full h-11 border border-slate-200 rounded-xl px-3 font-semibold text-slate-850 text-xs focus:ring-2 focus:ring-blue-105 focus:outline-none"
                          />
                          <p className="text-[10px] text-slate-400">Hari dimulainya formulir aktif bagi wali murid online.</p>
                        </div>

                        {/* 2. Date Tutup */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Tanggal Tutup Pendaftaran</label>
                          <input 
                            name="registration_close"
                            type="date"
                            required
                            defaultValue={spmbSettings?.registration_close || "2026-07-31"}
                            className="w-full h-11 border border-slate-200 rounded-xl px-3 font-semibold text-slate-850 text-xs focus:ring-2 focus:ring-blue-105 focus:outline-none"
                          />
                          <p className="text-[10px] text-slate-400">Sistem otomatis menolak isian pendaftar setelah melewati jam ini.</p>
                        </div>

                        {/* 3. Kuota Limit */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Target Kuota Siswa Utama (Daya Tampung)</label>
                          <input 
                            name="quota_limit"
                            type="number"
                            required
                            min={1}
                            defaultValue={spmbSettings?.quota_limit || 55}
                            className="w-full h-11 border border-slate-200 rounded-xl px-3 font-semibold text-slate-850 text-xs focus:ring-2 focus:ring-blue-105 focus:outline-none font-mono"
                          />
                          <p className="text-[10px] text-slate-400">
                            Jumlah maksimal pendaftar lolos. Saat ini terverifikasi: <strong className="text-emerald-600">{students.filter((s: any) => s && (s.status === 'VERIFIED' || s.status === 'Terverifikasi')).length}</strong>
                          </p>
                        </div>

                        {/* 4. Active Status Switcher */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Status Kuota Aktif</label>
                          <select 
                            name="registration_active"
                            defaultValue={spmbSettings?.registration_active !== undefined ? String(spmbSettings.registration_active) : "true"}
                            className="w-full h-11 border border-slate-200 rounded-xl px-3 font-semibold text-slate-850 text-xs focus:ring-2 focus:ring-blue-105 focus:outline-none"
                          >
                            <option value="true">Aktif (Menerima Pendaftar Baru)</option>
                            <option value="false">Tidak Aktif (Form Di-nonaktifkan Paksa)</option>
                          </select>
                          <p className="text-[10px] text-slate-400">Menutup akses formulir secara visual tanpa memedulikan batas tanggal.</p>
                        </div>

                        {/* 5. Waiting List System */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block font-sans">Sistem Waiting List Cadangan</label>
                          <select 
                            name="waiting_list_enabled"
                            defaultValue={spmbSettings?.waiting_list_enabled !== undefined ? String(spmbSettings.waiting_list_enabled) : "false"}
                            className="w-full h-11 border border-slate-200 rounded-xl px-3 font-semibold text-slate-850 text-xs focus:ring-2 focus:ring-blue-105 focus:outline-none"
                          >
                            <option value="false">Nonaktif (Batasi Formulir Jika Kuota Penuh)</option>
                            <option value="true">Aktifkan (Pendaftar Cadangan/Waiting List)</option>
                          </select>
                          <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                            Jika kuota sekolah penuh, ijinkan pendaftar berstatus "Waiting List" dan tawarkan verifikasi alternatif jika ada pembatalan pendaftar utama.
                          </p>
                        </div>

                      </div>

                      <div className="border-t border-slate-100 pt-6 flex items-center justify-end gap-3 font-sans">
                        <button 
                          type="button"
                          onClick={() => fetchSpmbSettings()}
                          className="px-5 h-11 border border-slate-200 hover:bg-slate-50 text-slate-600 font-extrabold rounded-xl transition-all text-xs uppercase tracking-wider"
                        >
                          Batal / Reset
                        </button>
                        <button 
                          type="submit"
                          className="px-6 h-11 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl transition-all shadow text-xs uppercase tracking-wider flex items-center gap-1.5"
                        >
                          Simpan & Aturan Aktif
                        </button>
                      </div>

                    </form>
                  </div>

                </div>
              )}

              {/* TAB 9: DOCUMENT & SIGNING CONFIGS */}
              {activeTab === 'document_settings' && (
                <div className="bg-white rounded-3xl border border-slate-200/70 shadow-[0_10px_40px_rgba(15,23,42,0.06)] overflow-hidden">
                  
                  <div className="p-6 border-b border-slate-150/70">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      Pengaturan Penandatangan Dokumen Resmi SPMB
                    </h3>
                    <p className="text-xs text-slate-500 font-medium font-sans mt-0.5">
                      Kelola identitas Ketua Panitia PMB, jabatan, NIP, serta unggahan berkas foto tanda tangan dan cap stempel digital untuk digenerasikan resmi ke dalam dokumen PDF bukti pendaftaran.
                    </p>
                  </div>

                  <div className="p-6 sm:p-8 space-y-8 font-sans">
                    
                    {/* Part A: Text Fields */}
                    <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-150 relative">
                      <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-3 py-1 rounded-full inline-block font-mono mb-4">A. Informasi Ketua Panitia PMB</span>
                      
                      <form 
                        onSubmit={async (e) => {
                          e.preventDefault();
                          try {
                            const res = await fetch('/api/document-settings/info', {
                              method: 'POST',
                              headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}` 
                              },
                              body: JSON.stringify({
                                committee_name: committeeNameInput,
                                committee_position: committeePositionInput,
                                committee_nip: committeeNipInput
                              })
                            });
                            const data = await res.json();
                            if (data.success) {
                              setDocSettings(data.settings);
                              Swal.fire({
                                icon: 'success',
                                title: 'Identitas Berhasil Disimpan',
                                text: data.message || 'Data identitas penandatangan berhasil diperbarui.',
                                confirmButtonColor: '#2563EB'
                              });
                            } else {
                              throw new Error(data.message || 'Failed to update info.');
                            }
                          } catch (err: any) {
                            Swal.fire({
                              icon: 'error',
                              title: 'Kesalahan Sistem',
                              text: err.message || 'Gagal memperbarui identitas ketua panitia.',
                              confirmButtonColor: '#ef4444'
                            });
                          }
                        }} 
                        className="space-y-4 font-sans text-xs"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">Nama Lengkap Ketua Panitia</label>
                            <input 
                              type="text"
                              value={committeeNameInput}
                              onChange={(e) => setCommitteeNameInput(e.target.value)}
                              placeholder="Contoh: Drs. H. Mulyadi, M.Pd."
                              className="w-full h-11 border border-slate-200 rounded-xl px-3 font-semibold text-slate-850 text-xs focus:ring-2 focus:ring-blue-100 focus:outline-none"
                              required
                            />
                            <p className="text-[10px] text-slate-400">Gunakan gelar akademis lengkap.</p>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">Jabatan Dokumen Resmi</label>
                            <input 
                              type="text"
                              value={committeePositionInput}
                              onChange={(e) => setCommitteePositionInput(e.target.value)}
                              placeholder="Contoh: Ketua Panitia PMB SDN Cibojong 1"
                              className="w-full h-11 border border-slate-200 rounded-xl px-3 font-semibold text-slate-850 text-xs focus:ring-2 focus:ring-blue-100 focus:outline-none"
                              required
                            />
                            <p className="text-[10px] text-slate-400">Akan tampil di atas core tanda tangan.</p>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">Nomor Induk Pegawai (NIP)</label>
                            <input 
                              type="text"
                              value={committeeNipInput}
                              onChange={(e) => setCommitteeNipInput(e.target.value)}
                              placeholder="Contoh: 197412081999031002"
                              className="w-full h-11 border border-slate-200 rounded-xl px-3 font-semibold text-slate-850 text-xs focus:ring-2 focus:ring-blue-100 focus:outline-none font-mono"
                            />
                            <p className="text-[10px] text-slate-400">Kosongkan jika tidak memiliki NIP resmi.</p>
                          </div>
                        </div>

                        <div className="flex justify-end pt-2">
                          <button 
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold h-11 px-6 rounded-xl transition-all shadow text-2xs uppercase tracking-wider flex items-center justify-center gap-1.5"
                          >
                            <span>Simpan Identitas Ketua</span>
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Part B: Images Upload (Signature and Stamp) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-sans">
                      
                      {/* B1. Digital Signature Card Container */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block font-mono">B1. Tanda Tangan Digital Ketua</span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                          Format PNG transparan dianjurkan agar menyatu elegan dengan lembaran dokumen biodata pendaftar.
                        </p>

                        <div className="border border-dashed border-slate-200 p-4 rounded-xl flex items-center justify-center bg-slate-50/20 h-32 relative group overflow-hidden">
                          {docSettings.committee_signature ? (
                            <div className="text-center">
                              <img 
                                src={docSettings.committee_signature} 
                                alt="Signature Preview" 
                                className="h-20 object-contain mx-auto transition-transform group-hover:scale-105" 
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ) : (
                            <div className="text-center text-slate-400 flex flex-col items-center">
                              <svg className="h-8 w-8 text-slate-300 stroke-[1.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              <span className="text-3xs mt-1.5 uppercase font-bold tracking-widest text-slate-400">Ttd Masih Menggunakan Fallback Vector</span>
                            </div>
                          )}
                        </div>

                        <div>
                          <input 
                            id="upload-committee-signature-input"
                            type="file" 
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const files = e.target.files;
                              if (!files || files.length === 0) return;
                              const file = files[0];
                              const fd = new FormData();
                              fd.append('photo', file);

                              try {
                                Swal.fire({
                                  title: 'Mengunggah tanda tangan...',
                                  text: 'Harap tunggu berkas sedang divalidasi.',
                                  allowOutsideClick: false,
                                  didOpen: () => Swal.showLoading()
                                });

                                const res = await fetch('/api/document-settings/signature', {
                                  method: 'POST',
                                  headers: { 'Authorization': `Bearer ${token}` },
                                  body: fd
                                });
                                const data = await res.json();
                                if (data.success) {
                                  setDocSettings(prev => ({ ...prev, committee_signature: data.committee_signature }));
                                  Swal.fire({
                                    icon: 'success',
                                    title: 'Unggah Sukses',
                                    text: 'Foto tanda tangan resmi diperbarui.',
                                    confirmButtonColor: '#2563EB'
                                  });
                                } else {
                                  throw new Error(data.message || 'Failed upload.');
                                }
                              } catch (err: any) {
                                Swal.fire({
                                  icon: 'error',
                                  title: 'Gagal Mengunggah',
                                  text: err.message || 'Verifikasi ukuran atau jenis file tidak cocok.',
                                  confirmButtonColor: '#ef4444'
                                });
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById('upload-committee-signature-input')?.click()}
                            className="w-full text-center bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold py-2 px-4 rounded-xl tracking-widest uppercase text-3xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Camera className="h-3.5 w-3.5 shrink-0" />
                            <span>Unggah Foto Tanda Tangan Baru</span>
                          </button>
                        </div>
                      </div>

                      {/* B2. Committee official stamp Card Container */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block font-mono">B2. Cap Stempel Kepanitiaan</span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                          Cap institusi atau panitia berwarna merah/biru. Bentuk melingkar dianjurkan transparan PNG.
                        </p>

                        <div className="border border-dashed border-slate-200 p-4 rounded-xl flex items-center justify-center bg-slate-50/20 h-32 relative group overflow-hidden">
                          {docSettings.committee_stamp ? (
                            <div className="text-center">
                              <img 
                                src={docSettings.committee_stamp} 
                                alt="Stamp Preview" 
                                className="h-20 object-contain mx-auto transition-transform group-hover:scale-105" 
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ) : (
                            <div className="text-center text-slate-400 flex flex-col items-center">
                              <svg className="h-8 w-8 text-slate-300 stroke-[1.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                              <span className="text-3xs mt-1.5 uppercase font-bold tracking-widest text-slate-400">Stempel Masih Menggunakan Fallback Vector</span>
                            </div>
                          )}
                        </div>

                        <div>
                          <input 
                            id="upload-committee-stamp-input"
                            type="file" 
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const files = e.target.files;
                              if (!files || files.length === 0) return;
                              const file = files[0];
                              const fd = new FormData();
                              fd.append('photo', file);

                              try {
                                Swal.fire({
                                  title: 'Mengunggah cap stempel...',
                                  text: 'Harap tunggu berkas sedang diproses sistem.',
                                  allowOutsideClick: false,
                                  didOpen: () => Swal.showLoading()
                                });

                                const res = await fetch('/api/document-settings/stamp', {
                                  method: 'POST',
                                  headers: { 'Authorization': `Bearer ${token}` },
                                  body: fd
                                });
                                const data = await res.json();
                                if (data.success) {
                                  setDocSettings(prev => ({ ...prev, committee_stamp: data.committee_stamp }));
                                  Swal.fire({
                                    icon: 'success',
                                    title: 'Unggah Sukses',
                                    text: 'Foto cap stempel kepanitiaan diperbarui.',
                                    confirmButtonColor: '#2563EB'
                                  });
                                } else {
                                  throw new Error(data.message || 'Failed upload.');
                                }
                              } catch (err: any) {
                                Swal.fire({
                                  icon: 'error',
                                  title: 'Gagal Mengunggah',
                                  text: err.message || 'Mohon periksa format foto Anda.',
                                  confirmButtonColor: '#ef4444'
                                });
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById('upload-committee-stamp-input')?.click()}
                            className="w-full text-center bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold py-2 px-4 rounded-xl tracking-widest uppercase text-3xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Camera className="h-3.5 w-3.5 shrink-0" />
                            <span>Unggah Foto Cap Stempel Baru</span>
                          </button>
                        </div>
                      </div>

                    </div>

                  </div>

                </div>
              )}

              {/* TAB 10: USER MANAGEMENT (SUPERADMIN ONLY) */}
              {activeTab === 'admin_users' && loggedInUser?.role === 'Superadmin' && (
                <div className="space-y-6">
                  {/* Metric Ribbon */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center gap-4">
                      <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Total Pengguna</span>
                        <span className="text-xl font-black text-slate-800">{adminUsers.length} Orang</span>
                      </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center gap-4">
                      <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Akun Aktif</span>
                        <span className="text-xl font-black text-slate-800">
                          {adminUsers.filter(u => u.status === 'Aktif').length} Akun
                        </span>
                      </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center gap-4">
                      <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Menunggu Verifikasi</span>
                        <span className="text-xl font-black text-slate-800">
                          {adminUsers.filter(u => u.status === 'Pending').length} Akun
                        </span>
                      </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm flex items-center gap-4">
                      <div className="h-10 w-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                        <XCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Ditolak / Nonaktif</span>
                        <span className="text-xl font-black text-slate-800">
                          {adminUsers.filter(u => u.status === 'Ditolak' || u.status === 'Nonaktif').length} Akun
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Backup & Database Maintenance Desk */}
                  <div className="bg-white rounded-3xl border border-slate-200/75 p-6 shadow-sm space-y-4">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Database className="h-4.5 w-4.5 text-blue-600" />
                        Cadangan & Pemulihan Sistem Database Permanen
                      </h4>
                      <p className="text-2xs text-slate-400 font-sans">
                        Ekspor seluruh isi database sekolah Anda ke file JSON terkompresi lokal, atau pulihkan kondisi database dari cadangan yang tersimpan.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-1">
                      <button
                        onClick={handleDownloadBackup}
                        className="h-11 px-5 bg-slate-900 hover:bg-slate-805 text-white font-extrabold text-3xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
                      >
                        <Download className="h-4 w-4" />
                        <span>Ekspor Database Utama (.JSON)</span>
                      </button>

                      <div className="relative">
                        <input
                          type="file"
                          accept=".json"
                          id="database_restore_input_file"
                          onChange={handleRestoreBackup}
                          disabled={isRestoring}
                          className="hidden"
                        />
                        <button
                          onClick={() => document.getElementById('database_restore_input_file')?.click()}
                          disabled={isRestoring}
                          className="h-11 px-5 bg-white border border-slate-250 hover:bg-slate-50 disabled:bg-slate-50 text-slate-700 font-extrabold text-3xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <RefreshCw className={`h-4 w-4 ${isRestoring ? 'animate-spin' : ''}`} />
                          <span>{isRestoring ? 'Memulihkan Sistem...' : 'Pulihkan Database dari File JSON'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Main Users List Table */}
                  <div className="bg-white rounded-3xl border border-slate-200/70 shadow-sm overflow-hidden font-sans">
                    <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 tracking-tight">Daftar Pengguna Administrator Website</h4>
                        <p className="text-2xs text-slate-400">Semua personel yang terdaftar dapat mengelola portal tergantung peranan</p>
                      </div>

                      <button
                        onClick={fetchAdminUsers}
                        className="h-9 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-3xs font-extrabold uppercase tracking-widest rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Refresh Data</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-2xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50/75 border-b border-slate-150 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            <th className="py-4 px-6">Identitas Pengguna</th>
                            <th className="py-4 px-4">Kontak</th>
                            <th className="py-4 px-4">Peran (Role)</th>
                            <th className="py-4 px-4">Keamanan / Email</th>
                            <th className="py-4 px-4 text-center">Status</th>
                            <th className="py-4 px-6 text-right">Aksi Kelola</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-705">
                          {adminUsers.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 px-6 text-center text-slate-400 font-bold uppercase tracking-widest font-mono">
                                Tidak ada data pengguna admin terdaftar
                              </td>
                            </tr>
                          ) : (
                            adminUsers.map((usr) => {
                              const isSelf = usr.email === loggedInUser?.email;
                              return (
                                <tr key={usr.id} className="hover:bg-slate-50/40 transition-colors">
                                  <td className="py-4.5 px-6">
                                    <div className="font-bold text-slate-900 text-xs">{usr.fullname}</div>
                                    <div className="text-slate-400 font-mono text-3xs font-bold mt-0.5">@{usr.username}</div>
                                  </td>
                                  <td className="py-4.5 px-4 font-sans text-xs">
                                    <div className="font-bold text-slate-700">{usr.email}</div>
                                    <div className="text-slate-400 font-mono text-[10px] mt-0.5">{usr.phone || '-'}</div>
                                  </td>
                                  <td className="py-4.5 px-4">
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                        usr.role === 'Superadmin' ? 'bg-indigo-50 text-indigo-700 border border-indigo-150' : 'bg-slate-100 text-slate-600'
                                      }`}>
                                        {usr.role}
                                      </span>
                                      {!isSelf && (
                                        <select
                                          value={usr.role}
                                          onChange={(e) => handleUpdateUserRole(usr.id, e.target.value)}
                                          className="text-2xs bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold focus:outline-none cursor-pointer"
                                        >
                                          <option value="Admin">Admin</option>
                                          <option value="Superadmin">Superadmin</option>
                                        </select>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-4.5 px-4 font-mono font-bold">
                                    <span className={usr.emailVerified ? 'text-emerald-600' : 'text-amber-500'}>
                                      {usr.emailVerified ? '✓ Verified' : '✗ Unverified'}
                                    </span>
                                  </td>
                                  <td className="py-4.5 px-4 text-center mr-auto">
                                    <div className="flex flex-col items-center gap-1.5">
                                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase inline-block ${
                                        usr.status === 'Aktif' ? 'bg-emerald-100 text-emerald-800' :
                                        usr.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                                        usr.status === 'Ditolak' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-600'
                                      }`}>
                                        {usr.status}
                                      </span>

                                      {!isSelf && (
                                        <select
                                          value={usr.status}
                                          onChange={(e) => handleUpdateUserStatus(usr.id, e.target.value)}
                                          className="text-[10px] bg-slate-50 border border-slate-200 rounded px-1 py-0.5 font-bold focus:outline-none cursor-pointer"
                                        >
                                          <option value="Pending">Pending</option>
                                          <option value="Aktif">Aktif</option>
                                          <option value="Nonaktif">Nonaktif</option>
                                          <option value="Ditolak">Ditolak</option>
                                        </select>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-4.5 px-6 text-right">
                                    {isSelf ? (
                                      <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-widest block">Akun Anda</span>
                                    ) : (
                                      <button
                                        onClick={() => handleDeleteUser(usr.id)}
                                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-xl transition-colors cursor-pointer inline-flex items-center justify-center"
                                        title="Hapus Akun Pengguna"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 11: LOGIN LOGS (SUPERADMIN ONLY) */}
              {activeTab === 'login_logs' && loggedInUser?.role === 'Superadmin' && (
                <div className="space-y-6">
                  {/* Performance Logging Deck */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/70 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <KeyRound className="h-4.5 w-4.5 text-blue-600" />
                        Log Aktivitas Otentikasi & Jejak Digital
                      </h3>
                      <p className="text-2xs text-slate-400 font-sans mt-0.5">
                        Merekam secara lengkap rincian tanggal login, alamat IP, peranti bersangkutan (device model), beserta browser untuk audit keamanan berkala.
                      </p>
                    </div>

                    <button
                      onClick={fetchLoginLogs}
                      className="h-10 px-5 bg-blue-650 hover:bg-blue-750 text-white font-extrabold text-3xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-1.5 shadow transition-colors cursor-pointer border-none"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Refresh Log Sesi</span>
                    </button>
                  </div>

                  {/* Logs Table */}
                  <div className="bg-white rounded-3xl border border-slate-200/70 shadow-sm overflow-hidden font-sans">
                    <div className="overflow-x-auto font-sans">
                      <table className="w-full text-left text-2xs border-collapse font-sans">
                        <thead>
                          <tr className="bg-slate-50/75 border-b border-slate-150 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            <th className="py-4 px-6">Waktu Kejadian (WIB)</th>
                            <th className="py-4 px-4">Identitas Email Sesi</th>
                            <th className="py-4 px-4">Alamat IP (Internet Protocol)</th>
                            <th className="py-4 px-6">Perangkat Keras & Peramban (User Agent)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono font-bold text-slate-600">
                          {loginLogs.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-8 px-6 text-center text-slate-400 uppercase tracking-widest font-bold font-mono">
                                Belum ada catatan aktivitas masuk terekam
                              </td>
                            </tr>
                          ) : (
                            // Show last 100 logs sorted by timestamp descending
                            [...loginLogs]
                              .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                              .map((log, idx) => (
                                <tr key={log.id || idx} className="hover:bg-slate-50/40 transition-colors">
                                  <td className="py-4 px-6 text-slate-900 text-3xs font-mono">
                                    {new Date(log.timestamp).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
                                  </td>
                                  <td className="py-4 px-4 text-xs font-bold text-blue-700 font-sans">
                                    {log.email}
                                  </td>
                                  <td className="py-4 px-4 text-slate-800 text-[11px] font-semibold font-mono">
                                    {log.ip}
                                  </td>
                                  <td className="py-4 px-6 text-slate-500 text-3xs truncate max-w-sm font-sans" title={log.userAgent}>
                                    {log.userAgent}
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>

        </main>
      </div>

      {/* E. PRINCIPAL EDITING / VERIFICATION MODAL COVERS */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop layer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStudent(null)}
              className="fixed inset-0 bg-slate-900"
            />

            {/* Modal layout panel details */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 z-10 border border-slate-200 shadow-2xl text-xs font-sans text-slate-800"
            >
              
              {/* Header Title section */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-900 text-[11px] bg-blue-105 px-2 bg-blue-50 border border-blue-100 py-0.5 rounded uppercase">
                      NOREG: {selectedStudent.registrationNumber}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      selectedStudent.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : selectedStudent.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {selectedStudent.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-tight mt-1">
                    Verifikasi Dokumen & Biodata Calon Murid
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedStudent(null)} 
                  className="p-1.5 h-8 w-8 hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Main inner block: Switch views between details-audit or pure form editing */}
              {!isEditingStudent ? (
                
                // AUDIT VIEW
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  {/* Left: Complete Biodata ledger */}
                  <div className="lg:col-span-7 space-y-5">
                    
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block font-mono border-b border-slate-100 pb-1 mb-2">1. Dokumen Berkas Diunggah</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono font-bold">
                        
                        <a 
                          href={selectedStudent.birthCertificateUrl || '#'} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl flex items-center justify-between transition-colors group"
                        >
                          <span className="truncate max-w-[150px] text-slate-700">Akta Kelahiran</span>
                          <span className="text-blue-600 group-hover:underline">Buka File &rarr;</span>
                        </a>

                        <a 
                          href={selectedStudent.familyCardUrl || '#'} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl flex items-center justify-between transition-colors group"
                        >
                          <span className="truncate max-w-[150px] text-slate-700">Kartu Keluarga</span>
                          <span className="text-blue-600 group-hover:underline">Buka File &rarr;</span>
                        </a>

                        <a 
                          href={selectedStudent.photoUrl || '#'} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl flex items-center justify-between transition-colors group"
                        >
                          <span className="truncate max-w-[150px] text-slate-700">Pas Foto Murid</span>
                          <span className="text-blue-600 group-hover:underline">Buka File &rarr;</span>
                        </a>

                        {selectedStudent.kindergartenCertificateUrl && (
                          <a 
                            href={selectedStudent.kindergartenCertificateUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl flex items-center justify-between transition-colors groupcol-span-1"
                          >
                            <span className="truncate max-w-[150px] text-slate-700">Ijazah TK</span>
                            <span className="text-blue-600 group-hover:underline">Buka File &rarr;</span>
                          </a>
                        )}

                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block font-mono border-b border-slate-100 pb-1 mb-2">2. Biodata Calon Siswa Baru</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 leading-relaxed">
                        <p><strong>Nama Lengkap:</strong> {selectedStudent.fullName}</p>
                        <p><strong>Tempat/Tgl Lahir:</strong> {selectedStudent.birthPlace}, {selectedStudent.birthDate}</p>
                        <p><strong>Jenis Kelamin:</strong> {selectedStudent.gender}</p>
                        <p><strong>Agama:</strong> {selectedStudent.religion || 'Islam'}</p>
                        <p><strong>No Telepon HP:</strong> {selectedStudent.phone}</p>
                        <p><strong>Asal Sekolah (TK/RA):</strong> {selectedStudent.previousSchool || 'Tidak Ada/Belum Sekolah'}</p>
                        <p className="sm:col-span-2"><strong>Alamat Tinggal Rumah:</strong> {selectedStudent.address}</p>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block font-mono border-b border-slate-100 pb-1 mb-2">3. Data Orang Tua / Wali</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 leading-relaxed">
                        <div>
                          <p><strong>Nama Ayah Kandung:</strong> {selectedStudent.fatherName || '-'}</p>
                          <p><strong>NIK Ayah:</strong> {selectedStudent.fatherNik || '-'}</p>
                          <p><strong>TTL Ayah:</strong> {selectedStudent.fatherBirthPlace || '-'}, {selectedStudent.fatherBirthDate || '-'}</p>
                          <p><strong>Agama Ayah:</strong> {selectedStudent.fatherReligion || '-'}</p>
                          <p><strong>Pekerjaan Ayah:</strong> {selectedStudent.fatherOccupation || '-'}</p>
                        </div>
                        <div>
                          <p><strong>Nama Ibu Kandung:</strong> {selectedStudent.motherName || '-'}</p>
                          <p><strong>NIK Ibu:</strong> {selectedStudent.motherNik || '-'}</p>
                          <p><strong>TTL Ibu:</strong> {selectedStudent.motherBirthPlace || '-'}, {selectedStudent.motherBirthDate || '-'}</p>
                          <p><strong>Agama Ibu:</strong> {selectedStudent.motherReligion || '-'}</p>
                          <p><strong>Pekerjaan Ibu:</strong> {selectedStudent.motherOccupation || '-'}</p>
                        </div>
                        <p className="sm:col-span-2"><strong>Nomor WhatsApp Aktif:</strong> +62 {selectedStudent.whatsappNumber || '-'}</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => {
                          setEditStudentForm({ ...selectedStudent });
                          setIsEditingStudent(true);
                        }}
                        className="px-4 py-2 hover:bg-slate-50 border border-slate-205 rounded-xl font-bold font-sans uppercase text-2xs tracking-wider cursor-pointer transition-colors"
                      >
                        Koreksi / Amandemen Biodata
                      </button>
                    </div>

                  </div>

                  {/* Right: Verification Status Trigger */}
                  <div className="lg:col-span-5 bg-slate-50/50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-4">
                    
                    <form onSubmit={handleUpdateVerification} className="space-y-4 font-sans text-xs">
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block font-mono mb-2">4. Keputusan Verifikasi</span>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer">
                            <input 
                              type="radio" 
                              name="verify_radio" 
                              checked={verifyStatus === 'VERIFIED'} 
                              onChange={() => setVerifyStatus('VERIFIED')} 
                              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500/20"
                            />
                            <span className="font-bold text-emerald-700">VERIFIED (Setuju / Terima Murid)</span>
                          </label>

                          <label className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer">
                            <input 
                              type="radio" 
                              name="verify_radio" 
                              checked={verifyStatus === 'PENDING'} 
                              onChange={() => setVerifyStatus('PENDING')} 
                              className="h-4 w-4 text-orange-650 focus:ring-orange-500/20"
                            />
                            <span className="font-bold text-orange-700">PENDING (Tinjau Berkas Ulang)</span>
                          </label>

                          <label className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer">
                            <input 
                              type="radio" 
                              name="verify_radio" 
                              checked={verifyStatus === 'REJECTED'} 
                              onChange={() => setVerifyStatus('REJECTED')} 
                              className="h-4 w-4 text-rose-600 focus:ring-rose-500/20"
                            />
                            <span className="font-bold text-rose-700">REJECTED (Tolak Berkas Murid)</span>
                          </label>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700 uppercase tracking-wider block">Komentar / Alasan Penolakan</label>
                        <textarea
                          value={verifyComment}
                          onChange={(e) => setVerifyComment(e.target.value)}
                          placeholder="Masukkan komentar (misal: 'Berkas KK berhasil diverifikasi fisik, siswa siap daftar ulang' atau 'Akta Kelahiran tidak terbaca')..."
                          rows={4}
                          className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-105 bg-white"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-extrabold uppercase rounded-full text-2xs tracking-wider shadow"
                      >
                        Simpan Keputusan Status
                      </button>
                    </form>

                  </div>

                </div>

              ) : (

                // EDIT BIODATA FORM VIEW
                <form onSubmit={handleSaveStudentEdits} className="space-y-5 font-sans">
                  <div className="flex justify-between items-center bg-slate-50/50 p-3 rounded-xl border border-slate-150">
                    <span className="font-bold text-slate-800">Mode Koreksi Administratif</span>
                    <button 
                      type="button" 
                      onClick={() => setIsEditingStudent(false)} 
                      className="text-xs text-blue-600 hover:underline font-extrabold"
                    >
                      Batal & Kembali ke Tinjauan Berkas
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium">
                    <div className="space-y-1.5 animate-fade-in">
                      <label className="font-bold text-slate-700">Nama Lengkap Murid</label>
                      <input
                        type="text"
                        value={editStudentForm.fullName || ''}
                        onChange={(e) => setEditStudentForm((prev: any) => ({ ...prev, fullName: e.target.value }))}
                        className="w-full h-10 border border-slate-200 rounded-lg px-3 focus:ring-2 focus:ring-blue-105"
                        required
                      />
                    </div>

                    <div className="space-y-1.5 animate-fade-in">
                      <label className="font-bold text-slate-700">NISN Siswa</label>
                      <input
                        type="text"
                        value={editStudentForm.nisn || ''}
                        onChange={(e) => setEditStudentForm((prev: any) => ({ ...prev, nisn: e.target.value }))}
                        className="w-full h-10 border border-slate-200 rounded-lg px-3 focus:ring-2 focus:ring-blue-105"
                      />
                    </div>

                    <div className="space-y-1.5 animate-fade-in">
                      <label className="font-bold text-slate-700">NIK Siswa / No KK</label>
                      <input
                        type="text"
                        value={editStudentForm.nik || ''}
                        onChange={(e) => setEditStudentForm((prev: any) => ({ ...prev, nik: e.target.value }))}
                        className="w-full h-10 border border-slate-200 rounded-lg px-3 focus:ring-2 focus:ring-blue-105"
                        required
                      />
                    </div>

                    <div className="space-y-1.5 animate-fade-in">
                      <label className="font-bold text-slate-700">Tempat Lahir</label>
                      <input
                        type="text"
                        value={editStudentForm.birthPlace || ''}
                        onChange={(e) => setEditStudentForm((prev: any) => ({ ...prev, birthPlace: e.target.value }))}
                        className="w-full h-10 border border-slate-200 rounded-lg px-3 focus:ring-2 focus:ring-blue-105"
                        required
                      />
                    </div>

                    <div className="space-y-1.5 animate-fade-in">
                      <label className="font-bold text-slate-700">Tanggal Lahir</label>
                      <input
                        type="date"
                        value={editStudentForm.birthDate || ''}
                        onChange={(e) => setEditStudentForm((prev: any) => ({ ...prev, birthDate: e.target.value }))}
                        className="w-full h-10 border border-slate-200 rounded-lg px-3 focus:ring-2 focus:ring-blue-105"
                        required
                      />
                    </div>

                    <div className="space-y-1.5 animate-fade-in">
                      <label className="font-bold text-slate-700">Jenis Kelamin</label>
                      <select
                        value={editStudentForm.gender || 'Laki-laki'}
                        onChange={(e) => setEditStudentForm((prev: any) => ({ ...prev, gender: e.target.value }))}
                        className="w-full h-10 border border-slate-200 rounded-lg px-3 focus:ring-2 focus:ring-blue-105 bg-slate-50"
                      >
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 animate-fade-in">
                      <label className="font-bold text-slate-700">No Telepon HP</label>
                      <input
                        type="text"
                        value={editStudentForm.phone || ''}
                        onChange={(e) => setEditStudentForm((prev: any) => ({ ...prev, phone: e.target.value }))}
                        className="w-full h-10 border border-slate-200 rounded-lg px-3 focus:ring-2 focus:ring-blue-105"
                        required
                      />
                    </div>

                    <div className="space-y-1.5 animate-fade-in">
                      <label className="font-bold text-slate-700">Asal Sekolah TK / RA</label>
                      <input
                        type="text"
                        value={editStudentForm.previousSchool || ''}
                        onChange={(e) => setEditStudentForm((prev: any) => ({ ...prev, previousSchool: e.target.value }))}
                        className="w-full h-10 border border-slate-200 rounded-lg px-3 focus:ring-2 focus:ring-blue-105"
                      />
                    </div>

                    <div className="space-y-1.5 animate-fade-in">
                      <label className="font-bold text-slate-700">No WhatsApp Orang Tua</label>
                      <input
                        type="text"
                        value={editStudentForm.whatsappNumber || ''}
                        onChange={(e) => setEditStudentForm((prev: any) => ({ ...prev, whatsappNumber: e.target.value }))}
                        className="w-full h-10 border border-slate-200 rounded-lg px-3 focus:ring-2 focus:ring-blue-105"
                      />
                    </div>

                    <div className="space-y-1.5 animate-fade-in sm:col-span-3">
                      <label className="font-bold text-slate-700">Alamat Tempat Tinggal</label>
                      <input
                        type="text"
                        value={editStudentForm.address || ''}
                        onChange={(e) => setEditStudentForm((prev: any) => ({ ...prev, address: e.target.value }))}
                        className="w-full h-10 border border-slate-200 rounded-lg px-3 focus:ring-2 focus:ring-blue-105"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-2xs uppercase shadow"
                    >
                      Simpan Seluruh Koreksi data
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingStudent(false)}
                      className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 border rounded-lg font-extrabold text-2xs uppercase text-slate-500"
                    >
                      Batal
                    </button>
                  </div>
                </form>

              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
