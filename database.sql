-- ==========================================
-- PRODUCTION MYSQL SCHEMA: SDN CIBOJONG 1
-- SYSTEM PENERIMAAN MAHASISWA BARU (SPMB)
-- TAHUN AJARAN 2026/2027
-- ==========================================

CREATE DATABASE IF NOT EXISTS sdn_cibojong1_spmb;
USE sdn_cibojong1_spmb;

-- 1. TABLE STUDENTS (DATA PESERTA DIDIK & ORANG TUA / WALI)
CREATE TABLE IF NOT EXISTS students (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  registration_number VARCHAR(20) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('PENDING', 'VERIFIED', 'REJECTED') DEFAULT 'PENDING',
  verification_comment TEXT NULL,

  -- A. DATA PESERTA DIDIK
  full_name VARCHAR(150) NOT NULL,
  gender ENUM('Laki-laki', 'Perempuan') NOT NULL,
  nisn VARCHAR(15) NULL,
  birth_place VARCHAR(100) NOT NULL,
  birth_date DATE NOT NULL,
  nik VARCHAR(20) NOT NULL,
  religion VARCHAR(50) NOT NULL,
  address TEXT NOT NULL,
  rt_rw VARCHAR(10) NOT NULL,
  village VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  postal_code VARCHAR(10) NOT NULL,
  stay_type VARCHAR(100) NOT NULL,
  transportation VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(100) NULL,
  previous_school VARCHAR(150) NOT NULL,
  child_number INT NOT NULL DEFAULT 1,
  birth_certificate_no VARCHAR(100) NOT NULL,
  family_card_no VARCHAR(100) NOT NULL,
  special_needs VARCHAR(100) DEFAULT 'Tidak Ada',

  -- B. DATA ORANG TUA (AYAH)
  father_name VARCHAR(150) NOT NULL,
  father_birth_year VARCHAR(4) NOT NULL,
  father_education VARCHAR(50) NOT NULL,
  father_occupation VARCHAR(100) NOT NULL,
  father_income VARCHAR(100) NOT NULL,
  father_nik VARCHAR(20) NOT NULL,

  -- DATA ORANG TUA (IBU)
  mother_name VARCHAR(150) NOT NULL,
  mother_birth_year VARCHAR(4) NOT NULL,
  mother_education VARCHAR(50) NOT NULL,
  mother_occupation VARCHAR(100) NOT NULL,
  mother_income VARCHAR(100) NOT NULL,
  mother_nik VARCHAR(20) NOT NULL,

  -- C. DATA WALI (OPSIONAL)
  guardian_name VARCHAR(150) NULL,
  guardian_birth_year VARCHAR(4) NULL,
  guardian_education VARCHAR(50) NULL,
  guardian_occupation VARCHAR(100) NULL,
  guardian_income VARCHAR(100) NULL,
  guardian_nik VARCHAR(20) NULL,

  -- D. DATA BANTUAN PEMERINTAH
  is_kip_kps_beneficiary ENUM('Ya', 'Tidak') DEFAULT 'Tidak',
  kip_kps_number VARCHAR(50) NULL,
  kip_name VARCHAR(150) NULL,
  kks_number VARCHAR(50) NULL,
  is_pip_eligible ENUM('Ya', 'Tidak') DEFAULT 'Tidak',
  pip_eligibility_reason TEXT NULL,

  -- E. DATA TAMBAHAN
  weight INT NOT NULL,
  height INT NOT NULL,
  head_circumference INT NOT NULL,
  sibling_count INT NOT NULL DEFAULT 0,
  home_distance DECIMAL(5,2) NOT NULL,

  -- FILE UPLOAD PATHS
  birth_certificate_url VARCHAR(255) NULL,
  family_card_url VARCHAR(255) NULL,
  photo_url VARCHAR(255) NULL,
  kip_kps_url VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. TABLE ANNOUNCEMENTS (PENGUMUMAN DAN SOSIALISASI)
CREATE TABLE IF NOT EXISTS announcements (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  date DATE NOT NULL,
  category ENUM('SPMB', 'Akademik', 'Kegiatan', 'Umum') DEFAULT 'Umum',
  author VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. TABLE GALLERY (FASILITAS & PRESTASI)
CREATE TABLE IF NOT EXISTS gallery (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  category ENUM('Fasilitas', 'Kegiatan', 'Prestasi', 'Belajar') DEFAULT 'Kegiatan',
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. TABLE CONTACT_MESSAGES (HUBUNGI KAMI)
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(100) NOT NULL,
  subject VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  date DATE NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- CREATE INDEXES FOR FREQUENT INQUIRIES
CREATE INDEX idx_student_registration ON students(registration_number);
CREATE INDEX idx_student_nisn ON students(nisn);
CREATE INDEX idx_student_status ON students(status);
CREATE INDEX idx_announcement_category ON announcements(category);
CREATE INDEX idx_gallery_category ON gallery(category);
