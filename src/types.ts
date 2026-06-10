export interface StudentData {
  id: string;
  registrationNumber: string;
  createdAt: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verificationComment?: string;

  // A. Data Peserta Didik
  fullName: string;
  gender: 'Laki-laki' | 'Perempuan';
  nisn: string;
  birthPlace: string;
  birthDate: string;
  nik: string;
  religion: string;
  address: string;
  rtRw: string;
  village: string;
  district: string;
  postalCode: string;
  stayType: string;
  transportation: string;
  phone: string;
  email: string;
  previousSchool: string;
  childNumber: number;
  birthCertificateNo: string;
  familyCardNo: string;
  specialNeeds: string;

  // B. Data Orang Tua
  fatherName: string;
  fatherBirthYear?: string;
  fatherEducation: string;
  fatherOccupation: string;
  fatherIncome: string;
  fatherNik: string;
  fatherReligion?: string;
  fatherBirthPlace?: string;
  fatherBirthDate?: string;

  motherName: string;
  motherMother?: string; // backup just in case
  motherBirthYear?: string;
  motherEducation: string;
  motherOccupation: string;
  motherIncome: string;
  motherNik: string;
  motherReligion?: string;
  motherBirthPlace?: string;
  motherBirthDate?: string;

  // C. Data Wali
  guardianName?: string;
  guardianBirthYear?: string;
  guardianEducation?: string;
  guardianOccupation?: string;
  guardianIncome?: string;
  guardianNik?: string;

  // D. Data Bantuan Pemerintah
  isKipKpsBeneficiary: 'Ya' | 'Tidak';
  kipKpsNumber?: string;
  kipName?: string;
  kksNumber?: string;
  isPipEligible: 'Ya' | 'Tidak';
  pipEligibilityReason?: string;

  // E. Data Tambahan
  weight: number; // kg
  height: number; // cm
  headCircumference: number; // cm
  siblingCount: number;
  homeDistance: number; // km

  // Files
  birthCertificateUrl?: string;
  familyCardUrl?: string;
  photoUrl?: string;
  kipKpsUrl?: string;
  kindergartenCertificateUrl?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  category: 'SPMB' | 'Akademik' | 'Kegiatan' | 'Umum';
  author: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: 'Fasilitas' | 'Kegiatan' | 'Prestasi' | 'Belajar';
  date: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  date: string;
  isRead: boolean;
}

export interface DashboardStats {
  totalStudents: number;
  verifiedStudents: number;
  rejectedStudents: number;
  pendingStudents: number;
  maleCount: number;
  femaleCount: number;
  totalAnnouncements: number;
  totalGalleryItems: number;
}
