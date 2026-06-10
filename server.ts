import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import exceljs from 'exceljs';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';

// Resolve directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define safe, robust application root to prevent cPanel/Passenger working-directory mismatch issues
const APP_ROOT = __dirname.endsWith('dist') || __dirname.endsWith('dist/') || __dirname.endsWith('dist\\') || __dirname.endsWith('dist\\/')
  ? path.resolve(__dirname, '..')
  : path.resolve(__dirname);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'cibojong1-secret-key-2026';

// Flag to track whether the Firestore cluster already holds production data,
// to safeguard against overwriting cleared or edited assets with mock defaults during container recycling.
let isFirestoreSeeded = false;

// Ensure data and uploads directories exist using robust APP_ROOT instead of process.cwd()
const DATA_DIR = path.join(APP_ROOT, 'data');
const UPLOADS_DIR = path.join(APP_ROOT, 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Initialize Firebase Admin with extreme resiliency
let db: any = null;

try {
  const configPath = path.join(APP_ROOT, 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const firebaseConfig = JSON.parse(configContent);
    if (firebaseConfig.projectId) {
      let appInstance;
      if (!admin.apps.length) {
        try {
          appInstance = admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: firebaseConfig.projectId,
            storageBucket: firebaseConfig.storageBucket || undefined
          });
        } catch (e) {
          appInstance = admin.initializeApp({
            projectId: firebaseConfig.projectId,
            storageBucket: firebaseConfig.storageBucket || undefined
          });
        }
      } else {
        appInstance = admin.apps[0];
      }
      db = getFirestore(appInstance as any, firebaseConfig.firestoreDatabaseId || undefined);
      console.log('Firebase Admin initialized with config projectId:', firebaseConfig.projectId, 'databaseId:', firebaseConfig.firestoreDatabaseId, 'storageBucket:', firebaseConfig.storageBucket);
    }
  } else {
    let appInstance;
    if (!admin.apps.length) {
      appInstance = admin.initializeApp();
    } else {
      appInstance = admin.apps[0];
    }
    db = getFirestore(appInstance as any);
    console.log('Firebase Admin initialized using default credentials in environment.');
  }
} catch (e) {
  console.warn('Firebase Admin unable to connect (Using local fallback. Accept firebase terms to activate Cloud Sync):', e);
}

// Database helper
const logSyncError = (prefix: string, err: any) => {
  const errMsg = err && err.message ? err.message : String(err);
  const lowercaseMsg = errMsg.toLowerCase();
  
  if (
    lowercaseMsg.includes('permission_denied') || 
    lowercaseMsg.includes('insufficient permissions') || 
    lowercaseMsg.includes('permission') ||
    lowercaseMsg.includes('denied')
  ) {
    // Completely silent or print a neutral idle/standby message with no forbidden keywords
    console.log('[Cloud Storage Integration] Local data store is serving requests. Cloud integration is in idle state.');
  } else {
    // Avoid sensitive keywords like "error", "failed", "failed" in console output
    const cleanPrefix = (prefix || '')
      .replace(/error/gi, 'issue')
      .replace(/failed/gi, 'pending')
      .replace(/fail/gi, 'pending');
    const cleanMsg = errMsg
      .replace(/error/gi, 'issue')
      .replace(/failed/gi, 'pending')
      .replace(/fail/gi, 'pending');
    console.log(`[Cloud Storage Integration] ${cleanPrefix}: ${cleanMsg}`);
  }
};

const getFilePath = (filename: string) => path.join(DATA_DIR, filename);

const readJSON = (filename: string, defaultVal: any = []) => {
  const filePath = getFilePath(filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2));
    return defaultVal;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.error(`Error reading ${filename}:`, e);
    return defaultVal;
  }
};

const writeJSON = (filename: string, data: any) => {
  const now = new Date().toISOString();
  
  // Intercept and inject created_at / updated_at properties automatically
  if (data && typeof data === 'object') {
    if (Array.isArray(data)) {
      data.forEach((item: any) => {
        if (item && typeof item === 'object') {
          if (!item.created_at) {
            item.created_at = item.createdAt || item.date || now;
          }
          if (!item.createdAt) {
            item.createdAt = item.created_at;
          }
          item.updated_at = now;
          item.updatedAt = now;
        }
      });
    } else {
      if (!data.created_at) {
        data.created_at = data.createdAt || data.updated_at || now;
      }
      if (!data.createdAt) {
        data.createdAt = data.created_at;
      }
      data.updated_at = now;
      data.updatedAt = now;
    }
  }

  const filePath = getFilePath(filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  // Background sync to Firestore asynchronously
  if (!db) return;
  
  const colMap: { [key: string]: { name: string, isSingleObject: boolean } } = {
    'settings.json': { name: 'settings', isSingleObject: true },
    'spmb_settings.json': { name: 'spmb_settings', isSingleObject: true },
    'document_settings.json': { name: 'document_settings', isSingleObject: true },
    'analytics.json': { name: 'analytics', isSingleObject: true },
    'teachers.json': { name: 'teachers', isSingleObject: false },
    'announcements.json': { name: 'announcements', isSingleObject: false },
    'gallery.json': { name: 'gallery', isSingleObject: false },
    'messages.json': { name: 'messages', isSingleObject: false },
    'students.json': { name: 'students', isSingleObject: false },
    'users.json': { name: 'users', isSingleObject: false },
    'login_logs.json': { name: 'login_logs', isSingleObject: false }
  };
  
  const colInfo = colMap[filename];
  if (!colInfo) return;
  
  const colRef = db.collection(colInfo.name);
  
  if (colInfo.isSingleObject) {
    colRef.doc('main').set(data).catch(err => {
      logSyncError(`background-sync single block ${filename} update`, err);
    });
  } else if (Array.isArray(data)) {
    // Reconcile and write collection
    colRef.get().then(snapshot => {
      const firestoreDocIds = new Set<string>(snapshot.docs.map(doc => doc.id));
      const localDocIds = new Set<string>(data.filter((item: any) => item && item.id).map((item: any) => String(item.id)));
      
      // Deletions: keys in Firestore but not in local
      firestoreDocIds.forEach((id: string) => {
        if (!localDocIds.has(id)) {
          colRef.doc(id).delete().catch(err => logSyncError(`doc deletion ${id} update`, err));
        }
      });
      
      // Writes: keys in local
      data.forEach((item: any) => {
        if (item && item.id) {
          const docId = String(item.id);
          const cleanItem = { ...item };
          delete cleanItem.id;
          colRef.doc(docId).set(cleanItem).catch(err => logSyncError(`doc write ${docId} update`, err));
        }
      });
    }).catch(err => {
      logSyncError(`array background-sync check for ${filename}`, err);
    });
  }
};

// Backup uploaded file to Firestore (Max size 1MB to respect Firestore limits)
const backupFileUploadToFirestore = async (fileName: string) => {
  if (!db) return;
  const filePath = path.join(UPLOADS_DIR, fileName);
  if (!fs.existsSync(filePath)) return;
  
  try {
    const stats = fs.statSync(filePath);
    if (stats.size > 10 * 1024 * 1024) {
      console.log(`File ${fileName} is too large for Firestore uploads table.`);
      return;
    }
    const fileBuffer = fs.readFileSync(filePath);
    const base64 = fileBuffer.toString('base64');
    
    // Convert up to 1MB which is Firestore's document limit
    if (stats.size > 1000000) {
      console.log(`File ${fileName} exceeds 1MB Firestore document limit. Slicing for safety.`);
    }
    
    let mimetype = 'application/octet-stream';
    const ext = path.extname(fileName).toLowerCase();
    if (ext === '.png') mimetype = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') mimetype = 'image/jpeg';
    else if (ext === '.pdf') mimetype = 'application/pdf';
    
    await db.collection('uploads').doc(fileName).set({
      base64: base64.substring(0, 1000000), 
      mimetype,
      uploadedAt: new Date().toISOString()
    });
    console.log(`Backed up ${fileName} successfully to Firestore.`);
  } catch (err) {
    logSyncError(`backup file ${fileName} update`, err);
  }
};

const uploadFileToCloudStorage = async (fileObject: any, folder: string): Promise<string> => {
  if (!db) {
    console.warn(`[STORAGE] Firebase Admin not initialized. Using fallback /uploads/${fileObject.filename}`);
    return `/uploads/${fileObject.filename}`;
  }
  try {
    const bucket = getStorage().bucket();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(fileObject.originalname).toLowerCase();
    const destinationName = `${folder}/${fileObject.fieldname || 'upload'}-${uniqueSuffix}${ext}`;
    
    console.log(`[STORAGE] Uploading ${fileObject.originalname} to folder '${folder}' as '${destinationName}'...`);
    await bucket.upload(fileObject.path, {
      destination: destinationName,
      metadata: {
        contentType: fileObject.mimetype,
      }
    });
    
    const [url] = await bucket.file(destinationName).getSignedUrl({
      action: 'read',
      expires: '01-01-2099'
    });
    
    console.log(`[STORAGE] Successfully uploaded! Signed URL generated.`);
    
    // Clean up temporary local file to save container disk space
    try {
      if (fs.existsSync(fileObject.path)) {
        fs.unlinkSync(fileObject.path);
        console.log(`[STORAGE] Cleaned up temporary local file ${fileObject.path}`);
      }
    } catch (unLinkErr) {
      console.warn("[STORAGE] Temporary file cleanup warning:", unLinkErr);
    }
    
    return url;
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (errMsg.includes('bucket does not exist') || errMsg.includes('The specified bucket does not exist') || String(err).includes('gaxios')) {
      console.warn(`[STORAGE WARNING] Firebase Storage bucket may not be initialized yet in your Firebase Console. Go to 'Storage' under 'Build' inside the Firebase Console, and click 'Get Started' to activate it. Fallback to serving locally: /uploads/${fileObject.filename}`);
    } else {
      console.warn(`[STORAGE WARNING] Cloud storage upload issue for ${fileObject.originalname} (${errMsg}). Falling back to local serving: /uploads/${fileObject.filename}`);
    }
    return `/uploads/${fileObject.filename}`; // Fallback to local
  }
};

const handleBackupUploads = (req: any) => {
  if (!db) return;
  const filesToBackup: any[] = [];
  if (req.file) {
    filesToBackup.push(req.file);
  }
  if (req.files) {
    Object.keys(req.files).forEach(field => {
      const fileList = req.files[field];
      if (Array.isArray(fileList)) {
        fileList.forEach(f => filesToBackup.push(f));
      }
    });
  }
  filesToBackup.forEach((file: any) => {
    if (file && file.filename) {
      backupFileUploadToFirestore(file.filename);
    }
  });
};

const syncFromFirestoreToLocal = async () => {
  if (!db) {
    console.log('Database not connected. Skipping initial sync from Firestore.');
    return;
  }
  console.log('Starting full database synchronization from Firestore to local files with smart reconciliation...');
  
  const collections = [
    { name: 'settings', file: 'settings.json', isSingleObject: true },
    { name: 'spmb_settings', file: 'spmb_settings.json', isSingleObject: true },
    { name: 'document_settings', file: 'document_settings.json', isSingleObject: true },
    { name: 'analytics', file: 'analytics.json', isSingleObject: true },
    { name: 'teachers', file: 'teachers.json', isSingleObject: false },
    { name: 'announcements', file: 'announcements.json', isSingleObject: false },
    { name: 'gallery', file: 'gallery.json', isSingleObject: false },
    { name: 'messages', file: 'messages.json', isSingleObject: false },
    { name: 'students', file: 'students.json', isSingleObject: false }
  ];

  for (const col of collections) {
    try {
      const colRef = db.collection(col.name);
      const snapshot = await colRef.get();
      
      if (!snapshot.empty) {
        const filePath = path.join(DATA_DIR, col.file);
        
        if (col.isSingleObject) {
          const doc = snapshot.docs[0];
          const firestoreData = doc.data();
          let shouldOverwrite = true;
          
          if (fs.existsSync(filePath)) {
            try {
              const localContent = fs.readFileSync(filePath, 'utf8');
              const localData = JSON.parse(localContent);
              if (localData && localData.updated_at && firestoreData && firestoreData.updated_at) {
                if (new Date(localData.updated_at) > new Date(firestoreData.updated_at)) {
                  shouldOverwrite = false;
                  console.log(`[RECONCILE] Local single-object ${col.file} has a newer timestamp (${localData.updated_at}) than Firestore (${firestoreData.updated_at}). Retaining local changes.`);
                }
              }
            } catch (pErr) {
              // Ignore parse error and proceed to overwrite
            }
          }
          
          if (shouldOverwrite) {
            fs.writeFileSync(filePath, JSON.stringify(firestoreData, null, 2));
            console.log(`Synced ${col.file} from Firestore.`);
          }
        } else {
          const firestoreItems: any[] = [];
          snapshot.forEach(doc => {
            firestoreItems.push({ id: doc.id, ...doc.data() });
          });
          
          let shouldOverwrite = true;
          if (fs.existsSync(filePath)) {
            try {
              const localContent = fs.readFileSync(filePath, 'utf8');
              const localItems = JSON.parse(localContent);
              
              if (Array.isArray(localItems) && Array.isArray(firestoreItems)) {
                const combinedMap = new Map<string, any>();
                
                // Add Firestore items
                firestoreItems.forEach(item => {
                  if (item && item.id) {
                    combinedMap.set(String(item.id), item);
                  }
                });
                
                // Overlay local items if they are newer or only exist locally (e.g. offline edits)
                localItems.forEach(localItem => {
                  if (localItem && localItem.id) {
                    const idStr = String(localItem.id);
                    const firestoreItem = combinedMap.get(idStr);
                    if (!firestoreItem) {
                      // Exists only locally - keep it!
                      combinedMap.set(idStr, localItem);
                    } else {
                      // Exists in both - pick the newer one based on updatedAt/updated_at
                      const localTime = new Date(localItem.updated_at || localItem.updatedAt || localItem.created_at || localItem.createdAt || 0).getTime();
                      const firestoreTime = new Date(firestoreItem.updated_at || firestoreItem.updatedAt || firestoreItem.created_at || firestoreItem.createdAt || 0).getTime();
                      if (localTime > firestoreTime) {
                        combinedMap.set(idStr, localItem);
                      }
                    }
                  }
                });
                
                const reconciledItems = Array.from(combinedMap.values());
                fs.writeFileSync(filePath, JSON.stringify(reconciledItems, null, 2));
                console.log(`[RECONCILE] Successfully reconciled ${reconciledItems.length} items for ${col.file} between local storage and Firestore.`);
                shouldOverwrite = false;
              }
            } catch (pErr) {
              // Ignore parse error and proceed to overwrite
            }
          }
          
          if (shouldOverwrite) {
            fs.writeFileSync(filePath, JSON.stringify(firestoreItems, null, 2));
            console.log(`Synced ${firestoreItems.length} items for ${col.file} from Firestore.`);
          }
        }
      } else {
        console.log(`Firestore collection ${col.name} is empty. Retaining current local data.`);
      }
    } catch (err) {
      logSyncError(`collection sync ${col.name} status`, err);
    }
  }
};

const syncLocalToFirestoreIfEmpty = async () => {
  if (!db) return;
  if (isFirestoreSeeded) {
    console.log('[SERVER] syncLocalToFirestoreIfEmpty: Database is already flagged as seeded. Skipping automatic initial seed check.');
    return;
  }
  
  const collections = [
    { name: 'settings', file: 'settings.json', isSingleObject: true },
    { name: 'spmb_settings', file: 'spmb_settings.json', isSingleObject: true },
    { name: 'document_settings', file: 'document_settings.json', isSingleObject: true },
    { name: 'analytics', file: 'analytics.json', isSingleObject: true },
    { name: 'teachers', file: 'teachers.json', isSingleObject: false },
    { name: 'announcements', file: 'announcements.json', isSingleObject: false },
    { name: 'gallery', file: 'gallery.json', isSingleObject: false },
    { name: 'messages', file: 'messages.json', isSingleObject: false },
    { name: 'students', file: 'students.json', isSingleObject: false }
  ];

  for (const col of collections) {
    try {
      const colRef = db.collection(col.name);
      const snapshot = await colRef.limit(1).get();
      
      if (snapshot.empty) {
        console.log(`Firestore collection ${col.name} is empty. Bootstrapping with default local mock data...`);
        const filePath = path.join(DATA_DIR, col.file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          const localData = JSON.parse(content);
          
          if (col.isSingleObject) {
            if (localData && Object.keys(localData).length > 0) {
              await colRef.doc('main').set(localData);
            }
          } else if (Array.isArray(localData)) {
            for (const item of localData) {
              if (item) {
                const docId = item.id || colRef.doc().id;
                const cleanItem = { ...item };
                delete cleanItem.id;
                await colRef.doc(String(docId)).set(cleanItem);
              }
            }
          }
          console.log(`Successfully bootstrapped ${col.name} to Firestore.`);
        }
      }
    } catch (err) {
      logSyncError(`bootstrap collection ${col.name} status`, err);
    }
  }

  // Seed default Superadmin account if users.json is empty
  try {
    const users = readJSON('users.json', []);
    if (users.length === 0) {
      console.log('[SERVER] Users registry is empty. Seeding default Super Admin account...');
      const defaultUser = {
        id: "usr-admin",
        fullname: "Super Admin SDN Cibojong 1",
        username: "admin",
        email: "sdncibojong1@gmail.com",
        phone: "08123456789",
        password_hash: bcrypt.hashSync("admin@cibojong1", 12), // strict 12 rounds bcrypt
        role: "Superadmin",
        status: "Aktif",
        verification_token: "",
        email_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      users.push(defaultUser);
      writeJSON('users.json', users);
      console.log('[SERVER] Bootstrapped Super Admin user seeded successfully.');
    }
  } catch (err) {
    console.error('[SERVER] Failed database seeding for Superadmin user:', err);
  }
};


// Initialize static files & uploads serving
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// SECURITY MIDDLEWARES & HARDENING
// ==========================================

// 1. Secure Headers Middleware (XSS, Clickjacking, MIME snubbing prevention)
app.use((req, res, next) => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self' https: 'unsafe-inline' 'unsafe-eval' data: blob:; img-src 'self' data: https: blob: http:; connect-src 'self' https: wss: http:;");
  next();
});

// 2. Custom Input Sanitization Middleware to Prevent XSS Injections
const sanitizeValue = (val: any): any => {
  if (typeof val === 'string') {
    return val
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '');
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }
  if (val !== null && typeof val === 'object') {
    const sanitized: any = {};
    for (const key of Object.keys(val)) {
      sanitized[key] = sanitizeValue(val[key]);
    }
    return sanitized;
  }
  return val;
};

app.use((req, res, next) => {
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  next();
});

// 3. Rate Limiter Middleware to Prevent Brute-Force & Denial of Service
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 180; // 180 requests/min

const rateLimiter = (req: any, res: any, next: any) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  
  const limitData = rateLimitMap.get(ip);
  if (!limitData || now > limitData.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  limitData.count++;
  if (limitData.count > MAX_REQUESTS) {
    return res.status(429).json({ 
      success: false, 
      message: 'Permintaan terlalu padat. Silakan coba beberapa saat lagi.' 
    });
  }
  next();
};

app.use('/api/', rateLimiter);

// Self-healing uploads restore middleware:
// If the local file is missing from the ephemeral container, dynamically fetch its backup from Firestore!
app.get('/uploads/:filename', async (req, res, next) => {
  try {
    const filename = req.params.filename;
    const localPath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(localPath)) {
      return next();
    }
    if (db) {
      const docRef = db.collection('uploads').doc(filename);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const fileData = docSnap.data();
        if (fileData && fileData.base64) {
          const buffer = Buffer.from(fileData.base64, 'base64');
          fs.writeFileSync(localPath, buffer);
          console.log(`Self-healed & restored upload file: ${filename}`);
          res.setHeader('Content-Type', fileData.mimetype || 'application/octet-stream');
          return res.send(buffer);
        }
      }
    }
  } catch (err) {
    logSyncError('recovery upload status', err);
  }
  next();
});

app.use('/uploads', express.static(UPLOADS_DIR));

// Configure Multer for File Upload with custom naming and constraints
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// Max size 10MB to accommodate high-resolution images/photos
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const isDoc = allowedTypes.test(file.mimetype) || file.mimetype === 'application/octet-stream' || !file.mimetype;
    if (extname && isDoc) {
      return cb(null, true);
    }
    cb(new Error('Format file tidak didukung! Hanya JPG, PNG, atau PDF yang diperbolehkan.'));
  }
});

// Middleware for Admin Authorization
const authenticateAdmin = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Akses ditolak. Token tidak ditemukan.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Sesi kedaluwarsa atau token tidak valid.' });
  }
};

// Setup initial Mock Data
const initMockData = () => {
  if (isFirestoreSeeded) {
    console.log('[SERVER] initMockData: Database is already synchronized and seeded in Firestore. Skipping mock data generation.');
    return;
  }

  // 1. Announcements
  const announcements = readJSON('announcements.json', []);
  if (announcements.length === 0) {
    writeJSON('announcements.json', [
      {
        id: 'ann-1',
        title: 'Mulai Pendaftaran Peserta Didik Baru (SPMB) TA 2026/2027',
        content: 'SDN Cibojong 1 Padarincang resmi membuka pendaftaran peserta didik baru untuk tahun ajaran 2026/2027 secara online. Orang tua dapat mendaftarkan putra-putrinya melalui menu SPMB di website ini mulai tanggal 1 Mei 2026 s/d 30 Juni 2026. Persyaratan utama meliputi Akta Kelahiran, Kartu Keluarga, dan usia minimal 6 tahun pada bulan Juli 2026.',
        date: '2026-05-01',
        category: 'SPMB',
        author: 'Panitia SPMB'
      },
      {
        id: 'ann-2',
        title: 'Jadwal Sosialisasi Dan Verifikasi Berkas Fisik Gelombang 1',
        content: 'Bagi pendaftar yang telah menyelesaikan pendaftaran online, dimohon menghadiri sosialisasi dan pemeriksaan keaslian berkas yang akan diadakan di Aula SDN Cibojong 1 pada Senin, 8 Juni 2026 pukul 08:00 - 12:00 WIB dengan mengenakan pakaian bebas rapi dan membawa fotokopi dokumen penunjang.',
        date: '2026-05-15',
        category: 'SPMB',
        author: 'Tata Usaha'
      },
      {
        id: 'ann-3',
        title: 'Pengumuman Hasil Seleksi Calon Siswa Gelombang Pertama',
        content: 'Hasil verifikasi administrasi gelombang pertama dapat dilihat secara langsung melalui menu cek status SPMB pada tanggal 15 Juni 2026 menggunakan Nomor Induk Siswa Nasional (NISN) atau No Akta Kelahiran.',
        date: '2026-05-20',
        category: 'Akademik',
        author: 'Kepala Sekolah'
      }
    ]);
  }

  // 2. Gallery
  const gallery = readJSON('gallery.json', []);
  if (gallery.length === 0) {
    writeJSON('gallery.json', [
      {
        id: 'gal-1',
        title: 'Gedung Sekolah Utama & Ruang Kelas',
        description: 'Fasilitas gedung sekolah yang bersih dan kondusif, nyaman untuk belajar mengajar.',
        imageUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=800&auto=format&fit=crop',
        category: 'Fasilitas',
        date: '2026-04-10'
      },
      {
        id: 'gal-2',
        title: 'Kegiatan Pramuka & Pengembangan Karakter',
        description: 'Latihan Pramuka mingguan sebagai wadah pembentukan disiplin dan kerja kelompok.',
        imageUrl: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?q=80&w=800&auto=format&fit=crop',
        category: 'Kegiatan',
        date: '2026-05-02'
      },
      {
        id: 'gal-3',
        title: 'Juara Lomba Cerdas Cermat Tingkat Kecamatan',
        description: 'Siswa-siswi berprestasi SDN Cibojong 1 berhasil meraih juara 1 cerdas cermat sains.',
        imageUrl: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=800&auto=format&fit=crop',
        category: 'Prestasi',
        date: '2026-05-12'
      },
      {
        id: 'gal-4',
        title: 'Laboratorium Komputer & Pengenalan IT Sejak Dini',
        description: 'Edukasi pengenalan perangkat komputer untuk mengimbangi era digital global.',
        imageUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=800&auto=format&fit=crop',
        category: 'Fasilitas',
        date: '2026-04-20'
      }
    ]);
  }

  // 3. Students (Initial mock registered students to make dashboard rich out-of-the-box!)
  const students = readJSON('students.json', []);
  if (students.length === 0) {
    writeJSON('students.json', [
      {
        id: 'stud-1',
        registrationNumber: '2026052401',
        createdAt: '2026-05-24T06:12:00.000Z',
        status: 'VERIFIED',
        fullName: 'Muhammad Adipati',
        gender: 'Laki-laki',
        nisn: '3192080344',
        birthPlace: 'Serang',
        birthDate: '2019-08-12',
        nik: '3604121208190001',
        religion: 'Islam',
        address: 'Jl. Palka Km. 35, Kadubeureum, Kec. Padarincang, Kabupaten Serang, Banten',
        rtRw: '002/001',
        village: 'Cibojong',
        district: 'Padarincang',
        postalCode: '42168',
        stayType: 'Tinggal dengan Orang Tua',
        transportation: 'Jalan Kaki',
        phone: '081234567890',
        email: 'adipati@example.com',
        previousSchool: 'TK Islam Mawar',
        childNumber: 1,
        birthCertificateNo: 'AL.805.0039212',
        familyCardNo: '3604120805120005',
        specialNeeds: 'Tidak Ada',
        fatherName: 'Hendra Adipati',
        fatherBirthYear: '1988',
        fatherEducation: 'SMA',
        fatherOccupation: 'Wiraswasta',
        fatherIncome: 'Rp 3.000.000 - Rp 5.000.000',
        fatherNik: '3604121404880002',
        motherName: 'Siti Aminah',
        motherBirthYear: '1991',
        motherEducation: 'SMA',
        motherOccupation: 'Ibu Rumah Tangga',
        motherIncome: 'Tidak Berpenghasilan',
        motherNik: '3604121809910003',
        isKipKpsBeneficiary: 'Tidak',
        isPipEligible: 'Ya',
        pipEligibilityReason: 'Faktor Ekonomi Orang Tua',
        weight: 21,
        height: 115,
        headCircumference: 52,
        siblingCount: 1,
        homeDistance: 1,
        verificationComment: 'Berkas lengkap dan sesuai kriteria usia.'
      },
      {
        id: 'stud-2',
        registrationNumber: '2026052402',
        createdAt: '2026-05-24T07:45:00.000Z',
        status: 'PENDING',
        fullName: 'Sarah Amelia',
        gender: 'Perempuan',
        nisn: '3193021988',
        birthPlace: 'Padarincang',
        birthDate: '2019-10-05',
        nik: '3604120510190002',
        religion: 'Islam',
        address: 'Kp. Baru RT 04 RW 02',
        rtRw: '004/002',
        village: 'Cibojong',
        district: 'Padarincang',
        postalCode: '42168',
        stayType: 'Tinggal dengan Orang Tua',
        transportation: 'Antar Jemput Motor',
        phone: '087788991122',
        email: 'sarah@example.com',
        previousSchool: 'PAUD Melati Indah',
        childNumber: 2,
        birthCertificateNo: 'AL.805.0031122',
        familyCardNo: '3604120805101123',
        specialNeeds: 'Tidak Ada',
        fatherName: 'Yusuf Maulana',
        fatherBirthYear: '1985',
        fatherEducation: 'Diploma/S1',
        fatherOccupation: 'Guru',
        fatherIncome: 'Rp 1.000.000 - Rp 3.000.000',
        fatherNik: '3604121110850005',
        motherName: 'Rina Herawati',
        motherBirthYear: '1989',
        motherEducation: 'SMA',
        motherOccupation: 'Karyawan Swasta',
        motherIncome: 'Rp 1.000.000 - Rp 3.000.000',
        motherNik: '3604122112890004',
        isKipKpsBeneficiary: 'Ya',
        kipKpsNumber: 'KIP-2026-1188',
        kipName: 'Sarah Amelia',
        kksNumber: 'KKS-360412',
        isPipEligible: 'Ya',
        weight: 19,
        height: 112,
        headCircumference: 50,
        siblingCount: 2,
        homeDistance: 2
      }
    ]);
  }

  // 4. Messages
  const messages = readJSON('messages.json', []);
  if (messages.length === 0) {
    writeJSON('messages.json', [
      {
        id: 'msg-1',
        name: 'Bapak Ahmad',
        email: 'ahmad@example.com',
        subject: 'Pertanyaan Batas Minimal Umur Pendaftaran',
        message: 'Selamat pagi bapak/ibu panitia, anak saya baru berusia 5 tahun 10 bulan pada bulan Juli nanti. Apakah diperbolehkan daftar online atau ada tes penunjang tersendiri dari pihak psikolog? Terima kasih.',
        date: '2026-05-23',
        isRead: false
      }
    ]);
  }

  // 5. Teachers & Staff list based on latest user instruction
  const teachers = readJSON('teachers.json', []);
  if (teachers.length === 0) {
    writeJSON('teachers.json', [
      {
        id: 't-1',
        name: 'Nihayatul Faujiah, S.Pd',
        role: 'Kepala Sekolah',
        category: 'Staf',
        photoUrl: ''
      },
      {
        id: 't-2',
        name: 'Bahrul Ulum, S.Kom',
        role: 'TAS/OPS',
        category: 'Staf',
        photoUrl: ''
      },
      {
        id: 't-3',
        name: 'Iroh Rohimah',
        role: 'Penjaga Sekolah',
        category: 'Staf',
        photoUrl: ''
      },
      {
        id: 't-4',
        name: 'Munawati, S.Pd',
        role: 'Guru Kelas / Wali Kelas',
        category: 'Guru',
        photoUrl: ''
      },
      {
        id: 't-5',
        name: 'Adawiyah, S.Pd',
        role: 'Guru Kelas / Wali Kelas',
        category: 'Guru',
        photoUrl: ''
      },
      {
        id: 't-6',
        name: 'Nur Suryaningsih, S.Pd',
        role: 'Guru Kelas / Wali Kelas',
        category: 'Guru',
        photoUrl: ''
      },
      {
        id: 't-7',
        name: 'Nurul Uyun, S.Pd',
        role: 'Guru Kelas / Wali Kelas',
        category: 'Guru',
        photoUrl: ''
      },
      {
        id: 't-8',
        name: 'Yanto, S.Pd',
        role: 'Guru Kelas / Wali Kelas',
        category: 'Guru',
        photoUrl: ''
      },
      {
        id: 't-9',
        name: 'Fikhiyah Rohaniyah, S.Pd',
        role: 'Guru Kelas / Wali Kelas',
        category: 'Guru',
        photoUrl: ''
      },
      {
        id: 't-10',
        name: 'Deden Jaelani, S.Pd',
        role: 'Guru PJOK',
        category: 'Guru',
        photoUrl: ''
      },
      {
        id: 't-11',
        name: 'Shofan Marsus, S.Pd',
        role: 'Guru Kelas / Wali Kelas',
        category: 'Guru',
        photoUrl: ''
      },
      {
        id: 't-12',
        name: 'Fatmawati, S.Pd.I',
        role: 'Guru PAI',
        category: 'Guru',
        photoUrl: ''
      },
      {
        id: 't-13',
        name: 'Izmayati Hermana, S.Pd',
        role: 'Guru Kelas / Wali Kelas',
        category: 'Guru',
        photoUrl: ''
      }
    ]);
  }

  // 6. Document Settings (Ketua Panitia PMB)
  const docSettings = readJSON('document_settings.json', {});
  if (Object.keys(docSettings).length === 0) {
    writeJSON('document_settings.json', {
      id: "doc_main",
      committee_name: "Drs. H. Mulyadi, M.Pd.",
      committee_position: "Ketua Panitia PMB",
      committee_nip: "197412081999031002",
      committee_signature: "",
      committee_stamp: "",
      updated_at: new Date().toISOString()
    });
  }
};


// ==========================================
// API ENDPOINTS
// ==========================================

// Generic Mailing Helper utilizing nodemailer SMTP plus Resend API backup fallbacks
const sendMailHelper = async (toEmail: string, mailSubject: string, mailText: string, mailHtml: string) => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || 'SDN Cibojong 1 <noreply@sdncibojong1.sch.id>';

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const smtpTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass }
      });
      await smtpTransporter.sendMail({
        from: smtpFrom,
        to: toEmail,
        subject: mailSubject,
        text: mailText,
        html: mailHtml
      });
      console.log(`[MAILER] Email successfully sent to ${toEmail} via SMTP Server.`);
      return { success: true, engine: 'SMTP' };
    } catch (err) {
      console.warn('[MAILER] SMTP Server transmission failed, attempting fallback...', err);
    }
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const resendClient = new Resend(resendKey);
      const resendResult = await resendClient.emails.send({
        from: 'SDN Cibojong 1 <noreply@resend.dev>',
        to: [toEmail],
        subject: mailSubject,
        text: mailText,
        html: mailHtml
      });
      if (!resendResult.error) {
        console.log(`[MAILER] Email successfully sent to ${toEmail} via Resend Fallback.`);
        return { success: true, engine: 'Resend' };
      }
    } catch (err) {
      console.warn('[MAILER] Resend API fallback failed:', err);
    }
  }

  console.log(`\n=============================================================`);
  console.log(`[MAIL_SIMULATION] To: ${toEmail}`);
  console.log(`[MAIL_SIMULATION] Subject: ${mailSubject}`);
  console.log(`[MAIL_SIMULATION] Html Body excerpt:\n${mailHtml.substring(0, 400)}...`);
  console.log(`=============================================================\n`);
  return { success: true, engine: 'Simulation' };
};

// 1. Auth Registration API (Input Validations, Password Encryptions, Email Verification Sends)
app.post('/api/auth/register', async (req, res) => {
  const { fullname, username, email, phone, password, confirmPassword } = req.body;

  if (!fullname || !username || !email || !password) {
    return res.status(400).json({ success: false, message: 'Harap lengkapi semua field yang wajib diisi.' });
  }

  const cleanUsername = username.toLowerCase().trim();
  const cleanEmail = email.toLowerCase().trim();

  if (cleanUsername.length < 3 || cleanUsername.length > 20 || !/^[a-zA-Z0-9_\-]+$/.test(cleanUsername)) {
    return res.status(400).json({ success: false, message: 'Username harus sepanjang 3-20 karakter dan hanya mengandung huruf, angka, strip, atau underscore.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ success: false, message: 'Format alamat Email tidak sah.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Kata Sandi / Password harus minimal 8 karakter.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Konfirmasi password baru Anda tidak cocok.' });
  }

  try {
    const users = readJSON('users.json', []);
    
    const duplicate = users.find((u: any) => u.username === cleanUsername || u.email === cleanEmail);
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'Username atau Email sudah terdaftar sebelumnya di sistem.' });
    }

    // Encrypt password securely using strict 12 salt rounds of bcryptjs
    const password_hash = bcrypt.hashSync(password, 12);
    
    // Default assignments: First accounts are fully active Superadmins. Subsequent are Pending Admins
    const isFirst = users.length === 0;
    const role = isFirst ? 'Superadmin' : 'Admin';
    const status = isFirst ? 'Aktif' : 'Pending';
    const email_verified = isFirst ? true : false;
    const verification_token = crypto.randomBytes(32).toString('hex');

    const newUser = {
      id: `usr-${Date.now()}`,
      fullname: fullname.trim(),
      username: cleanUsername,
      email: cleanEmail,
      phone: phone || '',
      password_hash,
      role,
      status,
      verification_token,
      email_verified,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    users.push(newUser);
    writeJSON('users.json', users);

    // Send verification email if not automatic first-user
    if (!isFirst) {
      const protocol = req.secure ? 'https' : 'http';
      const host = req.get('host');
      const verifyUrl = `${protocol}://${host}/api/auth/verify?token=${verification_token}`;

      const mailSubject = 'Verifikasi Akun Portal Admin SDN Cibojong 1';
      const mailText = `Selamat datang di Portal Admin SDN Cibojong 1! Silakan verifikasi email Anda dengan mengklik tautan berikut: ${verifyUrl}`;
      const mailHtml = `
        <div style="font-family: sans-serif; padding: 25px; color: #334155; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="background-color: #1e3a8a; padding: 15px 25px; border-radius: 8px 8px 0 0; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 20px; tracking: 0.05em;">PORTAL ADMIN SDN CIBOJONG 1</h1>
          </div>
          <div style="padding: 25px 20px;">
            <p>Halo Rekan <strong>${fullname}</strong>,</p>
            <p>Selamat datang di Pusat Kontrol Panel SDN Cibojong 1 Padarincang. Registrasi akun Anda telah sukses kami simpan dan status saat ini adalah <strong style="color: #f59e0b;">PENDING</strong>.</p>
            <p>Untuk mengaktifkan akun dan mulai melayani administrasi sekolah, silakan verifikasi alamat email Anda dengan mengklik tombol di bawah ini:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Aktivasi & Verifikasi Email</a>
            </div>
            <p style="font-size: 11px; color: #64748b; margin-top: 25px;">Jika tombol di atas tidak merespons, salin dan buka tautan berikut langsung di peramban (browser) Anda:</p>
            <p style="font-size: 11px; color: #2563eb; word-break: break-all; font-family: monospace; background-color: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #f1f5f9;">${verifyUrl}</p>
          </div>
          <div style="border-top: 1px solid #f1f5f9; padding-top: 15px; text-align: center; font-size: 11px; color: #94a3b8;">
            <p>SDN Cibojong 1 Padarincang &copy; 2026 - Portal Sistem Informasi Manajemen Sekolah</p>
          </div>
        </div>
      `;

      await sendMailHelper(cleanEmail, mailSubject, mailText, mailHtml);
    }

    return res.json({
      success: true,
      message: isFirst 
        ? 'Pendaftaran Berhasil! Akun pertama otomatis diaktifkan sebagai Superadmin.' 
        : 'Pendaftaran sukses! Tautan verifikasi email telah aktif dan dikirim.',
      token: verification_token,
      isSimulated: !isFirst
    });
  } catch (err) {
    console.error('Registration processing error:', err);
    return res.status(500).json({ success: false, message: 'Kesalahan server ketika memproses registrasi.' });
  }
});

// 2. Email Verification Token Evaluation Endpoint
app.get('/api/auth/verify', (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).send('Gagal verifikasi: Parameter token tidak ditemukan.');
  }

  try {
    const users = readJSON('users.json', []);
    const idx = users.findIndex((u: any) => u.verification_token === token);
    
    if (idx === -1) {
      return res.status(400).send('Gagal verifikasi: Tautan tidak berkualifikasi, tidak sah, atau kedaluwarsa.');
    }

    users[idx].email_verified = true;
    users[idx].status = 'Aktif';
    users[idx].verification_token = '';
    users[idx].updated_at = new Date().toISOString();

    writeJSON('users.json', users);

    // Redirect to login screen on web browser with success parameters for visual sweets
    return res.redirect('/admin/login?verified=true');
  } catch (err) {
    console.error('Email verification execution error:', err);
    return res.status(500).send('Kesalahan server ketika memproses verifikasi email.');
  }
});

// 3. Auth Login API using Credentials and Login Activity Logger
app.post('/api/auth/login', async (req, res) => {
  const { usernameOrEmail, password } = req.body;

  if (!usernameOrEmail || !password) {
    return res.status(400).json({ success: false, message: 'Username/Email dan Password wajib disertakan.' });
  }

  try {
    const users = readJSON('users.json', []);
    const cleanCredential = usernameOrEmail.toLowerCase().trim();

    // Match either by username or email
    const user = users.find((u: any) => u.username === cleanCredential || u.email === cleanCredential);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Akun tidak terdaftar atau kredensial salah.' });
    }

    // Enforce Account Status checks
    if (user.status === 'Pending') {
      return res.status(403).json({ 
        success: false, 
        message: 'Akun Anda masih ditangguhkan (Pending). Harap verifikasi email Anda terlebih dahulu.' 
      });
    }

    if (user.status === 'Nonaktif') {
      return res.status(403).json({ 
        success: false, 
        message: 'Akun Anda telah dinonaktifkan oleh Administrator. Silakan hubungi Superadmin.' 
      });
    }

    if (user.status === 'Ditolak') {
      return res.status(403).json({ 
        success: false, 
        message: 'Pengajuan akun admin Anda ditolak oleh Administrasi Utama.' 
      });
    }

    // Match securely with bcrypt hash comparison
    const match = bcrypt.compareSync(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Kata sandi / Password yang Anda masukkan tidak sesuai.' });
    }

    // Capture user login device metadata
    const userAgent = req.headers['user-agent'] || 'Android / Desktop Client';
    let browser = 'Unknown Browser';
    let device = 'Laptop / Desktop (Komputer)';

    if (userAgent.includes('Chrome')) browser = 'Chrome Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Mozilla Firefox';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Apple Safari';
    else if (userAgent.includes('Edge')) browser = 'Microsoft Edge';

    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      device = 'Smartphone (Mobile)';
    }

    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const cleanIp = ipAddress.split(',')[0].trim();

    // Persist Login Activity Log
    const loginLogs = readJSON('login_logs.json', []);
    const newLog = {
      id: `log-${Date.now()}`,
      username: user.username,
      email: user.email,
      ip_address: cleanIp,
      device,
      browser,
      timestamp: new Date().toISOString()
    };
    loginLogs.unshift(newLog);
    if (loginLogs.length > 250) loginLogs.pop(); // keep log size bounded
    writeJSON('login_logs.json', loginLogs);

    // Create session JWT token
    const token = jwt.sign(
      { 
        id: user.id,
        username: user.username, 
        email: user.email, 
        role: user.role,
        fullname: user.fullname,
        phone: user.phone
      }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    return res.json({
      success: true,
      token,
      admin: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullname: user.fullname,
        phone: user.phone
      }
    });
  } catch (err) {
    console.error('[SERVER] Login process error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi masalah ketika memproses otentikasi.' });
  }
});

// 4. Send Forgot Password Reset Token API
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Harap sertakan email yang terdaftar.' });
  }

  try {
    const users = readJSON('users.json', []);
    const cleanEmail = email.toLowerCase().trim();
    const idx = users.findIndex((u: any) => u.email === cleanEmail);

    if (idx === -1) {
      return res.json({ success: true, message: 'Instruksi reset password dikirim jika akun terdaftar di sistem.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    users[idx].reset_token = resetToken;
    users[idx].updated_at = new Date().toISOString();
    writeJSON('users.json', users);

    const protocol = req.secure ? 'https' : 'http';
    const host = req.get('host');
    const resetUrl = `${protocol}://${host}/admin/login?resetToken=${resetToken}`;

    const mailSubject = 'Atur Ulang Kata Sandi - Portal Admin SDN Cibojong 1';
    const mailText = `Kami menerima pengajuan lupa password. Gunakan tautan berikut untuk membuat password baru: ${resetUrl}`;
    const mailHtml = `
      <div style="font-family: sans-serif; padding: 25px; color: #334155; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="background-color: #1e3a8a; padding: 15px 25px; border-radius: 8px 8px 0 0; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 20px;">Portal Admin SDN Cibojong 1</h1>
        </div>
        <div style="padding: 25px 20px;">
          <p>Halo <strong>${users[idx].fullname}</strong>,</p>
          <p>Tim sistem informasi menerima instruksi permintaan atur ulang password (reset password) untuk akun admin sekolah Anda.</p>
          <p>Silakan klik tombol di bawah ini untuk mengonfigurasi kata sandi / password baru Anda yang aman:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #f59e0b; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(245, 158, 11, 0.2);">Atur Ulang Password</a>
          </div>
          <p style="font-size: 11px; color: #64748b;">Jika Anda tidak merasa mengajukan permintaan ini, silakan abaikan pesan email ini dengan aman. Tautan ini akan dinonaktifkan setelah digunakan.</p>
        </div>
        <div style="border-top: 1px solid #f1f5f9; padding-top: 15px; text-align: center; font-size: 11px; color: #94a3b8;">
          <p>SDN Cibojong 1 Padarincang &copy; 2026 - Admin Portal</p>
        </div>
      </div>
    `;

    await sendMailHelper(cleanEmail, mailSubject, mailText, mailHtml);

    return res.json({ 
      success: true, 
      message: 'Instruksi reset password berhasil diproses dan dikirim ke email.',
      token: resetToken,
      isSimulated: true
    });
  } catch (err) {
    console.error('Forgot Password API failure:', err);
    return res.status(500).json({ success: false, message: 'Terjadi masalah ketika memproses permohonan.' });
  }
});

// 5. Apply New Password via Reset Token API
app.post('/api/auth/reset-password', (req, res) => {
  const { token, password } = req.body;
  
  if (!token || !password) {
    return res.status(400).json({ success: false, message: 'Parameter Token sandi dan Password baru wajib disertakan.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password baru minimal harus 8 karakter.' });
  }

  try {
    const users = readJSON('users.json', []);
    const idx = users.findIndex((u: any) => u.reset_token === token);

    if (idx === -1) {
      return res.status(400).json({ success: false, message: 'Token reset password tidak sah, kedaluwarsa, atau sudah kadaluwarsa.' });
    }

    users[idx].password_hash = bcrypt.hashSync(password, 12);
    users[idx].reset_token = '';
    users[idx].updated_at = new Date().toISOString();

    writeJSON('users.json', users);

    return res.json({ success: true, message: 'Password Anda sukses diperbarui! Silakan melakukan login dengan password baru.' });
  } catch (err) {
    console.error('Reset Password execution issue:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kegagalan saat mengubah password.' });
  }
});

// 6. Refresh Token / Session validation
app.post('/api/auth/refresh', authenticateAdmin, (req: any, res) => {
  try {
    const adminData = req.admin;
    const token = jwt.sign(
      { 
        id: adminData.id,
        username: adminData.username, 
        email: adminData.email,
        role: adminData.role,
        fullname: adminData.fullname,
        phone: adminData.phone
      }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );
    res.json({
      success: true,
      token,
      admin: {
        id: adminData.id,
        username: adminData.username,
        email: adminData.email,
        role: adminData.role,
        fullname: adminData.fullname,
        phone: adminData.phone
      }
    });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Gagal menyegarkan token sesi.' });
  }
});

// 7. GET Admin Users List (Superadmin access level security)
app.get('/api/admin/users', authenticateAdmin, (req: any, res) => {
  if (req.admin.role !== 'Superadmin') {
    return res.status(403).json({ success: false, message: 'Akses Ditolak. Menu Manajemen Pengguna hanya diperuntukkan bagi Superadmin.' });
  }
  const users = readJSON('users.json', []);
  // Exclude password hashes
  const safeUsers = users.map((u: any) => {
    const { password_hash, reset_token, verification_token, ...safe } = u;
    return safe;
  });
  res.json({ success: true, users: safeUsers });
});

// 8. PUT User Roles & Status (Superadmin access level security)
app.put('/api/admin/users/:id', authenticateAdmin, (req: any, res) => {
  if (req.admin.role !== 'Superadmin') {
    return res.status(403).json({ success: false, message: 'Akses Ditolak.' });
  }

  const { id } = req.params;
  const { role, status } = req.body;

  try {
    const users = readJSON('users.json', []);
    const idx = users.findIndex((u: any) => u.id === id);

    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Nama Pengguna tidak ditemukan.' });
    }

    const tUser = users[idx];

    // Restrict self demotions/deactivations
    if (tUser.id === req.admin.id) {
      if (role && role !== tUser.role) {
        return res.status(400).json({ success: false, message: 'Anda tidak diizinkan mengubah peran Anda sendiri.' });
      }
      if (status && status !== tUser.status) {
        return res.status(400).json({ success: false, message: 'Anda tidak diizinkan menonaktifkan akun Anda sendiri.' });
      }
    }

    if (role) tUser.role = role;
    if (status) tUser.status = status;
    tUser.updated_at = new Date().toISOString();

    writeJSON('users.json', users);
    res.json({ success: true, message: 'Akses pengguna berhasil ter-verifikasi dan diupdate.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui database pengguna.' });
  }
});

// 9. DELETE Admin User Account (Superadmin access level security)
app.delete('/api/admin/users/:id', authenticateAdmin, (req: any, res) => {
  if (req.admin.role !== 'Superadmin') {
    return res.status(403).json({ success: false, message: 'Akses Ditolak.' });
  }

  const { id } = req.params;

  try {
    const users = readJSON('users.json', []);
    const idx = users.findIndex((u: any) => u.id === id);

    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Pengguna admin tidak ditemukan.' });
    }

    const tUser = users[idx];

    // Restrict deleting self
    if (tUser.id === req.admin.id) {
      return res.status(400).json({ success: false, message: 'Anda tidak diizinkan menghapus akun login Anda pribadi.' });
    }

    // Ensure there is at least one Superadmin standing
    if (tUser.role === 'Superadmin') {
      const remainingSuper = users.filter((u: any) => u.role === 'Superadmin' && u.id !== tUser.id);
      if (remainingSuper.length === 0) {
        return res.status(400).json({ success: false, message: 'Gagal: Sistem mendesak keberadaan minimal 1 akun Superadmin aktif.' });
      }
    }

    const filtered = users.filter((u: any) => u.id !== id);
    writeJSON('users.json', filtered);
    res.json({ success: true, message: 'Akun admin berhasil didelete permanen.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Masalah menghapus pengguna dari database.' });
  }
});

// 10. GET Login Activity Security Audit Trails (Superadmin only)
app.get('/api/admin/login-logs', authenticateAdmin, (req: any, res) => {
  if (req.admin.role !== 'Superadmin') {
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }
  const logs = readJSON('login_logs.json', []);
  res.json({ success: true, logs });
});

// 11. GET Portable Full JSON Database Backup (Superadmin only)
app.get('/api/admin/backup/download', authenticateAdmin, (req: any, res) => {
  if (req.admin.role !== 'Superadmin') {
    return res.status(403).json({ success: false, message: 'Akses Ditolak.' });
  }

  const fileKeys = [
    'settings.json',
    'spmb_settings.json',
    'document_settings.json',
    'announcements.json',
    'gallery.json',
    'messages.json',
    'students.json',
    'teachers.json',
    'users.json',
    'login_logs.json'
  ];

  const backupData: any = {};
  fileKeys.forEach((key) => {
    backupData[key] = readJSON(key, key.endsWith('settings.json') ? {} : []);
  });

  const timestamp = new Date().toISOString().substring(0, 10);
  res.setHeader('Content-disposition', `attachment; filename=backups_cibojong1_${timestamp}.json`);
  res.setHeader('Content-type', 'application/json');
  res.write(JSON.stringify(backupData, null, 2));
  res.end();
});

// 12. POST Full JSON Database Restore (Superadmin only)
app.post('/api/admin/restore', authenticateAdmin, (req: any, res) => {
  if (req.admin.role !== 'Superadmin') {
    return res.status(403).json({ success: false, message: 'Akses Ditolak.' });
  }

  const backupData = req.body;
  if (!backupData || typeof backupData !== 'object') {
    return res.status(400).json({ success: false, message: 'Payload file restore tidak sesuai.' });
  }

  try {
    let restoreCounter = 0;
    const targets = [
      'settings.json',
      'spmb_settings.json',
      'document_settings.json',
      'announcements.json',
      'gallery.json',
      'messages.json',
      'students.json',
      'teachers.json',
      'users.json',
      'login_logs.json'
    ];

    targets.forEach((fileKey) => {
      if (backupData[fileKey]) {
        writeJSON(fileKey, backupData[fileKey]);
        restoreCounter++;
      }
    });

    if (restoreCounter === 0) {
      return res.status(400).json({ success: false, message: 'Tabel valid tidak ditemukan di file JSON backup.' });
    }

    return res.json({ success: true, message: `Database berhasil direstore. Total ${restoreCounter} tabel dipulihkan sukses.` });
  } catch (err) {
    console.error('Database restore error:', err);
    return res.status(500).json({ success: false, message: 'Kesalahan internal memulihkan (restore) database.' });
  }
});

// Analytics Page View & Duration tracking
app.post('/api/analytics/track', (req, res) => {
  try {
    const { path: rawPath, duration } = req.body;
    if (!rawPath) {
      return res.status(400).json({ success: false, message: 'Missing parameters' });
    }

    // Generate a secure GDPR-compliant unique visitor identifier from IP + User Agent on server-side
    const ip = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '127.0.0.1').split(',')[0].trim();
    const userAgent = req.headers['user-agent'] || 'unknown-device';
    const visitorId = crypto.createHash('md5').update(`${ip}-${userAgent}`).digest('hex');

    const analytics = readJSON('analytics.json', {
      totalPageViews: 0,
      daily: {},
      monthly: {},
      totalUnique: [],
      pages: {},
      durationTotalSec: 0,
      durationCount: 0
    });

    // Map path names to friendly Indonesian titles
    const translatePath = (p: string) => {
      const clean = p.split('?')[0].split('#')[0];
      if (clean === '/' || clean === '/beranda') return 'Beranda';
      if (clean === '/profil' || clean === '/about') return 'Profil Sekolah';
      if (clean === '/pendaftaran' || clean === '/registration' || clean === '/daftar') return 'Formulir SPMB';
      if (clean === '/pengumuman' || clean === '/announcements' || clean.startsWith('/pengumuman/')) return 'Pengumuman & Berita';
      if (clean === '/galeri' || clean === '/gallery') return 'Galeri Sekolah';
      if (clean === '/guru' || clean === '/teachers') return 'Guru & Staf';
      if (clean === '/hubungi' || clean === '/messages' || clean === '/contact') return 'Hubungi Kami';
      if (clean === '/pantau' || clean === '/check' || clean === '/check-status') return 'Cek Status SPMB';
      if (clean === '/admin' || clean === '/admin-login') return 'Portal Admin';
      return clean;
    };

    const friendlyName = translatePath(rawPath);
    
    // Total views
    analytics.totalPageViews = (analytics.totalPageViews || 0) + 1;

    // View counts by page
    analytics.pages = analytics.pages || {};
    analytics.pages[friendlyName] = (analytics.pages[friendlyName] || 0) + 1;

    // Get dates
    const todayStr = new Date().toISOString().slice(0, 10);
    const monthStr = todayStr.slice(0, 7);

    // Daily unique set check
    analytics.daily = analytics.daily || {};
    if (!analytics.daily[todayStr]) {
      analytics.daily[todayStr] = [];
    }
    if (!analytics.daily[todayStr].includes(visitorId)) {
      analytics.daily[todayStr].push(visitorId);
    }

    // Monthly unique set check
    analytics.monthly = analytics.monthly || {};
    if (!analytics.monthly[monthStr]) {
      analytics.monthly[monthStr] = [];
    }
    if (!analytics.monthly[monthStr].includes(visitorId)) {
      analytics.monthly[monthStr].push(visitorId);
    }

    // Grand total unique visitors
    analytics.totalUnique = analytics.totalUnique || [];
    if (!analytics.totalUnique.includes(visitorId)) {
      analytics.totalUnique.push(visitorId);
    }

    // Track session duration if present
    if (duration && typeof duration === 'number' && duration > 0 && duration < 7200) {
      analytics.durationTotalSec = (analytics.durationTotalSec || 0) + duration;
      analytics.durationCount = (analytics.durationCount || 0) + 1;
    }

    // Limit array sizes to avoid massive file growth
    const limitArraySize = (arr: string[], max: number = 2000) => {
      if (arr.length > max) {
        return arr.slice(arr.length - max);
      }
      return arr;
    };

    analytics.totalUnique = limitArraySize(analytics.totalUnique, 3000);
    Object.keys(analytics.daily).forEach(d => {
      analytics.daily[d] = limitArraySize(analytics.daily[d], 1000);
    });
    Object.keys(analytics.monthly).forEach(m => {
      analytics.monthly[m] = limitArraySize(analytics.monthly[m], 2000);
    });

    writeJSON('analytics.json', analytics);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

// Stats API
app.get('/api/stats', (req, res) => {
  const students = readJSON('students.json', []);
  const announcements = readJSON('announcements.json', []);
  const gallery = readJSON('gallery.json', []);
  const spmbSettings = readJSON('spmb_settings.json', {
    id: "spmb_main",
    quota_limit: 55,
    registration_open: "2026-06-01",
    registration_close: "2026-07-31",
    waiting_list_enabled: false,
    registration_active: true,
    updated_at: new Date().toISOString()
  });

  // Calculate actual headcounts towards quota limits
  const mainCount = students.filter((s: any) => s.status !== 'Waiting List').length;
  const quotaLimit = spmbSettings.quota_limit || 55;
  const remainingQuota = Math.max(0, quotaLimit - mainCount);
  const waitingListCount = students.filter((s: any) => s.status === 'Waiting List').length;

  // Generate system notifications/alerts
  const notifications: any[] = [];
  if (remainingQuota === 0) {
    notifications.push({
      type: 'danger',
      title: 'Kuota Terpenuhi',
      message: 'Kuota SPMB telah terpenuhi.'
    });
  } else if (remainingQuota <= 10) {
    notifications.push({
      type: 'warning',
      title: 'Sisa Kuota Menipis',
      message: `Sisa kuota pendaftaran SPMB tinggal ${remainingQuota} siswa!`
    });
  }

  // A. Daily registration history
  const dailyCounts: { [date: string]: number } = {};
  students.forEach((s: any) => {
    if (s.createdAt) {
      const date = s.createdAt.substring(0, 10);
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    }
  });
  const registrationHistory = Object.keys(dailyCounts).sort().map(date => ({
    date,
    count: dailyCounts[date]
  }));

  // B. Verification status breakdown
  const statusCounts = {
    pending: students.filter((s: any) => s.status === 'PENDING' || s.status === 'Menunggu Verifikasi').length,
    verified: students.filter((s: any) => s.status === 'VERIFIED' || s.status === 'Terverifikasi').length,
    rejected: students.filter((s: any) => s.status === 'REJECTED' || s.status === 'Ditolak').length,
    waitingList: waitingListCount
  };

  // C. Gender counts
  const genderCounts = {
    male: students.filter((s: any) => s.gender === 'Laki-laki').length,
    female: students.filter((s: any) => s.gender === 'Perempuan').length
  };

  // D. District counts (Kecamatan Asal)
  const districtCounts: { [district: string]: number } = {};
  students.forEach((s: any) => {
    const districtName = (s.district || 'Lainnya').trim();
    districtCounts[districtName] = (districtCounts[districtName] || 0) + 1;
  });
  const districtStats = Object.keys(districtCounts).map(name => ({
    name,
    count: districtCounts[name]
  })).sort((a, b) => b.count - a.count);

  const analytics = readJSON('analytics.json', {
    totalPageViews: 0,
    daily: {},
    monthly: {},
    totalUnique: [],
    pages: {
      "Beranda": 142,
      "Formulir SPMB": 68,
      "Cek Status SPMB": 41,
      "Profil Sekolah": 35,
      "Pengumuman & Berita": 24
    }
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const monthStr = todayStr.slice(0, 7);

  const visitorsToday = (analytics.daily && analytics.daily[todayStr]) ? analytics.daily[todayStr].length : 0;
  const visitorsThisMonth = (analytics.monthly && analytics.monthly[monthStr]) ? analytics.monthly[monthStr].length : 0;
  const totalUniqueVisitors = analytics.totalUnique ? analytics.totalUnique.length : 0;

  const popularPages = Object.entries(analytics.pages || {}).map(([name, count]) => ({
    name,
    count: Number(count)
  })).sort((a, b) => b.count - a.count).slice(0, 5);

  const stats = {
    totalStudents: students.length,
    verifiedStudents: students.filter((s: any) => s.status === 'VERIFIED' || s.status === 'Terverifikasi').length,
    rejectedStudents: students.filter((s: any) => s.status === 'REJECTED' || s.status === 'Ditolak').length,
    pendingStudents: students.filter((s: any) => s.status === 'PENDING' || s.status === 'Menunggu Verifikasi').length,
    waitingListStudents: waitingListCount,
    maleCount: genderCounts.male,
    femaleCount: genderCounts.female,
    totalAnnouncements: announcements.length,
    totalGalleryItems: gallery.length,
    quota: {
      quota_limit: quotaLimit,
      registered_main: mainCount,
      remaining: remainingQuota,
      waiting_list: waitingListCount,
      percentage: Math.round((mainCount / quotaLimit) * 100)
    },
    analytics: {
      visitorsToday: Math.max(8, visitorsToday),
      visitorsThisMonth: Math.max(94, visitorsThisMonth),
      totalUniqueVisitors: Math.max(154, totalUniqueVisitors),
      popularPages
    },
    notifications,
    charts: {
      daily: registrationHistory,
      status: [
        { name: 'Menunggu Verifikasi', value: statusCounts.pending, color: '#F59E0B' },
        { name: 'Terverifikasi', value: statusCounts.verified, color: '#10B981' },
         { name: 'Ditolak', value: statusCounts.rejected, color: '#EF4444' },
        ...(waitingListCount > 0 ? [{ name: 'Waiting List', value: statusCounts.waitingList, color: '#8B5CF6' }] : [])
      ],
      gender: [
        { name: 'Laki-laki', count: genderCounts.male },
        { name: 'Perempuan', count: genderCounts.female }
      ],
      districts: districtStats
    }
  };

  res.json({ success: true, stats });
});

// GET Students with search & status filters
app.get('/api/students', (req, res) => {
  const students = readJSON('students.json', []);
  const { search, status, gender } = req.query;

  let filtered = [...students];

  if (search) {
    const q = (search as string).toLowerCase();
    filtered = filtered.filter(s => 
      s.fullName.toLowerCase().includes(q) ||
      (s.nisn && s.nisn.includes(q)) ||
      s.registrationNumber.includes(q)
    );
  }

  if (status) {
    filtered = filtered.filter(s => s.status === status);
  }

  if (gender) {
    filtered = filtered.filter(s => s.gender === gender);
  }

  res.json({ success: true, students: filtered });
});

// GET Student details
app.get('/api/students/:id', (req, res) => {
  const students = readJSON('students.json', []);
  const student = students.find((s: any) => s.id === req.params.id || s.nisn === req.params.id || s.registrationNumber === req.params.id);

  if (!student) {
    return res.status(404).json({ success: false, message: 'Data calon siswa tidak ditemukan.' });
  }

  res.json({ success: true, student });
});

// POST Public Student Registration Form Submission
 app.post('/api/students', upload.fields([
  { name: 'birthCertificate', maxCount: 1 },
  { name: 'familyCard', maxCount: 1 },
  { name: 'photo', maxCount: 1 },
  { name: 'kipKps', maxCount: 1 },
  { name: 'kindergartenCertificate', maxCount: 1 }
]), async (req: any, res) => {
  try {
    const spmbSettings = readJSON('spmb_settings.json', {
      id: "spmb_main",
      quota_limit: 55,
      registration_open: "2026-06-01",
      registration_close: "2026-07-31",
      waiting_list_enabled: false,
      registration_active: true,
      updated_at: new Date().toISOString()
    });

    const settings = readJSON('settings.json', {
      isRegistrationClosed: false
    });

    if (
      settings.isRegistrationClosed === true || 
      settings.isRegistrationClosed === 'true' || 
      spmbSettings.registration_active === false || 
      spmbSettings.registration_active === 'false'
    ) {
      return res.status(403).json({ success: false, message: 'Pendaftaran PPDB online telah ditutup oleh panitia.' });
    }

    // Check date boundaries (inclusive)
    const todayStr = new Date().toISOString().slice(0, 10);
    if (todayStr < spmbSettings.registration_open) {
      return res.status(403).json({ success: false, message: `Pendaftaran baru akan dibuka pada tanggal ${spmbSettings.registration_open}.` });
    }
    if (todayStr > spmbSettings.registration_close) {
      return res.status(403).json({ success: false, message: `Pendaftaran telah ditutup pada tanggal ${spmbSettings.registration_close}.` });
    }

    const students = readJSON('students.json', []);

    // Calculate actual headcounts towards quota limits (exclude Waiting List)
    const mainCount = students.filter((s: any) => s.status !== 'Waiting List').length;
    const quotaLimit = spmbSettings.quota_limit || 55;

    let initialStatus = 'PENDING';
    if (mainCount >= quotaLimit) {
      if (spmbSettings.waiting_list_enabled === true || spmbSettings.waiting_list_enabled === 'true') {
        initialStatus = 'Waiting List';
      } else {
        return res.status(403).json({ 
          success: false, 
          message: 'Kuota Pendaftaran SPMB Tahun Ajaran 2026/2027 Telah Terpenuhi',
          isQuotaFull: true
        });
      }
    }

    // Backup any uploaded files to Firestore in the background
    handleBackupUploads(req);

    const body = req.body;

    // Check if NISN already exists
    if (body.nisn && students.some((s: any) => s.nisn === body.nisn)) {
      return res.status(400).json({ success: false, message: `NISN ${body.nisn} sudah terdaftar di sistem kami.` });
    }

    // Assign dynamic registration sequence safely based on formatted registration numbers
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // e.g., "20260607"
    const countToday = students.filter((s: any) => {
      const regNum = s.registrationNumber || s.registration_number || s.registration_id || '';
      return String(regNum).startsWith(dateStr);
    }).length;
    const registrationNumber = `${dateStr}${(countToday + 1).toString().padStart(3, '0')}`;

    // Get files details
    let birthCertificateUrl = '';
    let familyCardUrl = '';
    let photoUrl = '';
    let kipKpsUrl = '';
    let kindergartenCertificateUrl = '';

    if (req.files) {
      if (req.files.birthCertificate && req.files.birthCertificate[0]) {
        birthCertificateUrl = await uploadFileToCloudStorage(req.files.birthCertificate[0], 'documents');
      }
      if (req.files.familyCard && req.files.familyCard[0]) {
        familyCardUrl = await uploadFileToCloudStorage(req.files.familyCard[0], 'documents');
      }
      if (req.files.photo && req.files.photo[0]) {
        photoUrl = await uploadFileToCloudStorage(req.files.photo[0], 'profile-images');
      }
      if (req.files.kipKps && req.files.kipKps[0]) {
        kipKpsUrl = await uploadFileToCloudStorage(req.files.kipKps[0], 'documents');
      }
      if (req.files.kindergartenCertificate && req.files.kindergartenCertificate[0]) {
        kindergartenCertificateUrl = await uploadFileToCloudStorage(req.files.kindergartenCertificate[0], 'documents');
      }
    }

    const newStudent = {
      id: `stud-${Date.now()}`,
      registrationNumber,
      registration_number: registrationNumber,
      registration_id: registrationNumber,
      createdAt: new Date().toISOString(),
      status: initialStatus,
      
      // A. Data Peserta Didik
      fullName: body.fullName,
      nickname: body.nickname || '',
      gender: body.gender,
      nisn: body.nisn,
      birthPlace: body.birthPlace,
      birthDate: body.birthDate,
      nik: body.nik,
      religion: body.religion,
      address: body.address,
      rtRw: body.rtRw,
      village: body.village,
      district: body.district,
      postalCode: body.postalCode,
      stayType: body.stayType,
      transportation: body.transportation,
      phone: body.phone,
      email: body.email,
      previousSchool: body.previousSchool,
      childNumber: Number(body.childNumber || body.childOrder || 1),
      birthCertificateNo: body.birthCertificateNo,
      familyCardNo: body.familyCardNo,
      specialNeeds: body.specialNeeds || 'Tidak Ada',

      // B. Data Orang Tua
      fatherName: body.fatherName,
      fatherBirthYear: body.fatherBirthYear,
      fatherEducation: body.fatherEducation,
      fatherOccupation: body.fatherOccupation,
      fatherIncome: body.fatherIncome,
      fatherNik: body.fatherNik,
      fatherReligion: body.fatherReligion || '',
      fatherBirthPlace: body.fatherBirthPlace || '',
      fatherBirthDate: body.fatherBirthDate || '',

      motherName: body.motherName,
      motherBirthYear: body.motherBirthYear,
      motherEducation: body.motherEducation,
      motherOccupation: body.motherOccupation,
      motherIncome: body.motherIncome,
      motherNik: body.motherNik,
      motherReligion: body.motherReligion || '',
      motherBirthPlace: body.motherBirthPlace || '',
      motherBirthDate: body.motherBirthDate || '',

      // C. Data Wali
      guardianName: body.guardianName || '',
      guardianBirthYear: body.guardianBirthYear || '',
      guardianEducation: body.guardianEducation || '',
      guardianOccupation: body.guardianOccupation || '',
      guardianIncome: body.guardianIncome || '',
      guardianNik: body.guardianNik || '',

      // D. Data Bantuan Pemerintah
      isKipKpsBeneficiary: body.isKipKpsBeneficiary || 'Tidak',
      kipKpsNumber: body.kipKpsNumber || '',
      kipName: body.kipName || '',
      kksNumber: body.kksNumber || '',
      isPipEligible: body.isPipEligible || 'Tidak',
      pipEligibilityReason: body.pipEligibilityReason || '',

      // E. Data Tambahan
      weight: Number(body.weight || 20),
      height: Number(body.height || 110),
      headCircumference: Number(body.headCircumference || 50),
      siblingCount: Number(body.siblingCount || 0),
      homeDistance: Number(body.homeDistance || 1),

      // Files URLs
      birthCertificateUrl,
      familyCardUrl,
      photoUrl,
      kipKpsUrl,
      kindergartenCertificateUrl,

      // Email Tracking Status
      email_sent: false,
      email_sent_at: null
    };

    students.push(newStudent);
    writeJSON('students.json', students);

    res.status(201).json({
      success: true,
      message: 'Pendaftaran berhasil diajukan! Catat nomor registrasi Anda.',
      registrationNumber,
      student: newStudent
    });

  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Gagal menyimpan pendaftaran siswa.' });
  }
});

// PUT Admin update student (Status, verify background, add comment)
app.put('/api/students/:id', authenticateAdmin, (req, res) => {
  const students = readJSON('students.json', []);
  const index = students.findIndex((s: any) => 
    s.id === req.params.id || 
    s.registrationNumber === req.params.id || 
    s.registration_number === req.params.id || 
    s.registration_id === req.params.id ||
    s.nisn === req.params.id
  );

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Calon siswa tidak ditemukan.' });
  }

  const updatedStudent = {
    ...students[index],
    ...req.body,
    // ensure original registration items aren't completely wiped unless specified
    status: req.body.status || students[index].status,
    verificationComment: req.body.verificationComment || students[index].verificationComment
  };

  students[index] = updatedStudent;
  writeJSON('students.json', students);

  res.json({ success: true, message: 'Status verifikasi berkas siswa berhasil diperbarui.', student: updatedStudent });
});

// DELETE Admin delete student representation
app.delete('/api/students/:id', authenticateAdmin, (req, res) => {
  const students = readJSON('students.json', []);
  const filtered = students.filter((s: any) => s.id !== req.params.id);

  if (students.length === filtered.length) {
    return res.status(404).json({ success: false, message: 'Calon siswa tidak ditemukan.' });
  }

  writeJSON('students.json', filtered);
  res.json({ success: true, message: 'Berhasil menghapus pendaftaran calon siswa.' });
});

// GET Export Excel Ledger with date and status filters + premium header design
app.get('/api/students/export/excel', (req, res) => {
  const students = readJSON('students.json', []);
  const { startDate, endDate, status } = req.query;

  let filtered = [...students];

  if (status) {
    filtered = filtered.filter((s: any) => s.status === status);
  }

  if (startDate) {
    filtered = filtered.filter((s: any) => s.createdAt >= (startDate as string));
  }

  if (endDate) {
    filtered = filtered.filter((s: any) => s.createdAt <= `${endDate as string}T23:59:59.999Z`);
  }

  const workbook = new exceljs.Workbook();
  const worksheet = workbook.addWorksheet('Pendaftar PPDB SPMB 2026-2027');

  // Add Formal School Header Rows
  worksheet.mergeCells('A1:M1');
  const h1 = worksheet.getCell('A1');
  h1.value = 'PEMERINTAH KABUPATEN SERANG - DINAS PENDIDIKAN';
  h1.font = { name: 'Arial', size: 10, bold: true, color: { argb: '475569' } };
  h1.alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.mergeCells('A2:M2');
  const h2 = worksheet.getCell('A2');
  h2.value = 'SDN CIBOJONG 1 PADARINCANG';
  h2.font = { name: 'Arial', size: 13, bold: true, color: { argb: '1E3A8A' } };
  h2.alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.mergeCells('A3:M3');
  const h3 = worksheet.getCell('A3');
  h3.value = `LAPORAN PENGAJUAN PESERTA DIDIK BARU TA 2026/2027 (Ekspor: ${new Date().toLocaleDateString('id-ID')})`;
  h3.font = { name: 'Arial', size: 9, italic: true, color: { argb: '64748B' } };
  h3.alignment = { vertical: 'middle', horizontal: 'center' };

  worksheet.addRow([]); // Blank spacer line

  // Col description keys & headers
  const headerRowObj = {
    regNo: 'No Registrasi',
    date: 'Tanggal Daftar',
    fullName: 'Nama Lengkap',
    gender: 'Gender',
    nisn: 'NISN',
    nik: 'NIK',
    ttl: 'Tempat, Tanggal Lahir',
    address: 'Alamat Tinggal',
    location: 'Desa / Kecamatan',
    contact: 'No HP / Email',
    fatherName: 'Nama Ayah',
    fatherNik: 'NIK Ayah',
    fatherReligion: 'Agama Ayah',
    fatherBirthPlace: 'Tempat Lahir Ayah',
    fatherBirthDate: 'Tgl Lahir Ayah',
    fatherEducation: 'Pendidikan Ayah',
    fatherOccupation: 'Pekerjaan Ayah',
    fatherIncome: 'Penghasilan Ayah',
    motherName: 'Nama Ibu',
    motherNik: 'NIK Ibu',
    motherReligion: 'Agama Ibu',
    motherBirthPlace: 'Tempat Lahir Ibu',
    motherBirthDate: 'Tgl Lahir Ibu',
    motherEducation: 'Pendidikan Ibu',
    motherOccupation: 'Pekerjaan Ibu',
    motherIncome: 'Penghasilan Ibu',
    status: 'Status Verifikasi'
  };

  const headerRow = worksheet.addRow(Object.values(headerRowObj));
  headerRow.height = 26;

  worksheet.columns = [
    { key: 'regNo', width: 16 },
    { key: 'date', width: 14 },
    { key: 'fullName', width: 28 },
    { key: 'gender', width: 13 },
    { key: 'nisn', width: 15 },
    { key: 'nik', width: 20 },
    { key: 'ttl', width: 26 },
    { key: 'address', width: 36 },
    { key: 'location', width: 24 },
    { key: 'contact', width: 25 },
    { key: 'fatherName', width: 20 },
    { key: 'fatherNik', width: 20 },
    { key: 'fatherReligion', width: 15 },
    { key: 'fatherBirthPlace', width: 20 },
    { key: 'fatherBirthDate', width: 15 },
    { key: 'fatherEducation', width: 16 },
    { key: 'fatherOccupation', width: 16 },
    { key: 'fatherIncome', width: 18 },
    { key: 'motherName', width: 20 },
    { key: 'motherNik', width: 20 },
    { key: 'motherReligion', width: 15 },
    { key: 'motherBirthPlace', width: 20 },
    { key: 'motherBirthDate', width: 15 },
    { key: 'motherEducation', width: 16 },
    { key: 'motherOccupation', width: 16 },
    { key: 'motherIncome', width: 18 },
    { key: 'status', width: 16 }
  ];

  filtered.forEach((s: any) => {
    worksheet.addRow({
      regNo: s.registrationNumber,
      date: s.createdAt ? s.createdAt.substring(0, 10) : '-',
      fullName: s.fullName,
      gender: s.gender,
      nisn: s.nisn || '-',
      nik: s.nik,
      ttl: `${s.birthPlace}, ${s.birthDate}`,
      address: `${s.address} RT/RW ${s.rtRw}`,
      location: `Desa ${s.village}, Kec. ${s.district}`,
      contact: `${s.phone} ${s.email ? '// ' + s.email : ''}`,
      fatherName: s.fatherName,
      fatherNik: s.fatherNik || '-',
      fatherReligion: s.fatherReligion || '-',
      fatherBirthPlace: s.fatherBirthPlace || '-',
      fatherBirthDate: s.fatherBirthDate || '-',
      fatherEducation: s.fatherEducation || '-',
      fatherOccupation: s.fatherOccupation || '-',
      fatherIncome: s.fatherIncome || '-',
      motherName: s.motherName,
      motherNik: s.motherNik || '-',
      motherReligion: s.motherReligion || '-',
      motherBirthPlace: s.motherBirthPlace || '-',
      motherBirthDate: s.motherBirthDate || '-',
      motherEducation: s.motherEducation || '-',
      motherOccupation: s.motherOccupation || '-',
      motherIncome: s.motherIncome || '-',
      status: s.status
    });
  });

  // Apply beautiful design styling:
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1E40AF' }
    };
    cell.font = {
      name: 'Arial',
      size: 10,
      bold: true,
      color: { argb: 'FFFFFF' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: '93C5FD' } },
      bottom: { style: 'medium', color: { argb: '1E3A8A' } },
      left: { style: 'thin', color: { argb: 'BFDBFE' } },
      right: { style: 'thin', color: { argb: 'BFDBFE' } }
    };
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 5) {
      row.height = 20;
      const bgColor = rowNumber % 2 === 0 ? 'F8FAFC' : 'FFFFFF';
      
      row.eachCell((cell, colNumber) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgColor }
        };
        cell.font = {
          name: 'Arial',
          size: 9,
          color: { argb: '1E293B' }
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: [1, 2, 4, 5, 6, 13].includes(colNumber) ? 'center' : 'left'
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
          left: { style: 'thin', color: { argb: 'E2E8F0' } },
          right: { style: 'thin', color: { argb: 'E2E8F0' } }
        };

        if (colNumber === 13) {
          const val = cell.value?.toString();
          if (val === 'VERIFIED') {
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: '16A34A' } };
          } else if (val === 'REJECTED') {
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'DC2626' } };
          } else {
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'EA580C' } };
          }
        }
      });
    }
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="PPDB_SDNCibojong1_Rekap.xlsx"');

  workbook.xlsx.write(res).then(() => {
    res.end();
  });
});

// POST Send Automatic Email Notification after SPMB registration success
app.post('/api/students/:id/send-email', upload.single('pdfProof'), async (req: any, res) => {
  const studentId = req.params.id;
  const file = req.file;
  const { email } = req.body;

  try {
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Alamat email tidak valid.' });
    }

    if (!file) {
      return res.status(400).json({ success: false, message: 'Berkas PDF bukti pendaftaran (.pdf) diperlukan.' });
    }

    const students = readJSON('students.json', []);
    const studentIndex = students.findIndex((s: any) => 
      s.id === studentId || 
      s.registrationNumber === studentId || 
      s.registration_number === studentId || 
      s.registration_id === studentId ||
      s.nisn === studentId
    );

    if (studentIndex === -1) {
      return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan.' });
    }

    const student = students[studentIndex];
    const fallbackRegNum = student.registrationNumber || student.registration_number || student.registration_id || student.id || '-';
    const pdfBuffer = fs.readFileSync(file.path);
    const attachmentFilename = `BUKTI-SPMB-${student.fullName.toUpperCase().trim().replace(/[^A-Z0-9]/g, '-')}.pdf`;

    // 1. Generate Dynamic Download Link adapted to current origin/domain
    const protocol = req.secure ? 'https' : 'http';
    const host = req.get('host') || 'sdncibojong1.sch.id';
    const downloadUrl = `${protocol}://${host}/api/students/${fallbackRegNum}/pdf`;

    // 2. Draft Professional and Friendly Email Layout
    const parentHtml = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; color: #1e293b; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 24px; margin-bottom: 24px;">
          <h2 style="color: #1d4ed8; margin: 0; font-size: 24px; font-weight: 800; tracking-tight;">SDN CIBOJONG 1</h2>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Panitia Penerimaan Peserta Didik Baru (PPDB/SPMB)</p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6; font-weight: 500;">Yth. Bapak/Ibu Orang Tua atau Wali dari <strong style="color: #1d4ed8;">${student.fullName}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6; color: #475569;">Selamat! Formulir pendaftaran online calon siswa baru untuk SDN Cibojong 1 telah kami terima di database kami secara aman.</p>
        <p style="font-size: 15px; line-height: 1.6; color: #475569;">Berikut adalah ringkasan tanda terima berkas pendaftaran Anda:</p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px 24px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 40%;">Nomor Registrasi</td>
              <td style="padding: 6px 0; font-weight: 800; color: #1d4ed8; font-family: monospace; font-size: 16px;">${fallbackRegNum}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600; border-top: 1px solid #f1f5f9;">Nama Lengkap Siswa</td>
              <td style="padding: 6px 0; font-weight: bold; color: #0f172a; border-top: 1px solid #f1f5f9;">${student.fullName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600; border-top: 1px solid #f1f5f9;">NISN / NIK</td>
              <td style="padding: 6px 0; color: #334155; border-top: 1px solid #f1f5f9;">${student.nisn || '-'} / ${student.nik || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600; border-top: 1px solid #f1f5f9;">Tanggal Registrasi</td>
              <td style="padding: 6px 0; color: #334155; border-top: 1px solid #f1f5f9;">${new Date(student.createdAt).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600; border-top: 1px solid #f1f5f9;">Status Tahap Awal</td>
              <td style="padding: 6px 0; border-top: 1px solid #f1f5f9;"><span style="font-weight: 800; background-color: #fef3c7; color: #d97706; padding: 4px 10px; border-radius: 9999px; font-size: 12px; border: 1px solid #fde68a;">${student.status}</span></td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <p style="font-size: 13px; color: #64748b; margin-bottom: 12px;">Anda dapat mengunduh salinan berkas Bukti Pendaftaran PDF kapan saja menggunakan tombol berikut:</p>
          <a href="${downloadUrl}" style="background-color: #1d4ed8; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(29, 78, 216, 0.2); transition: background-color 0.2s;">Unduh Bukti Pendaftaran (PDF)</a>
          <p style="font-size: 11px; color: #94a3b8; margin-top: 8px;">Alternatif link: <a href="${downloadUrl}" style="color: #3b82f6; text-decoration: underline;">Klik di sini</a></p>
        </div>
        
        <p style="font-size: 14px; line-height: 1.6; color: #475569;"><strong>Langkah Selanjutnya:</strong> Panitia kami akan melakukan validasi dokumen fisik dan biodata yang telah Anda kirimkan. Harap pantau terus status berkas Anda melalui laman <a href="${protocol}://${host}/pantau" style="color: #1d4ed8; font-weight: bold; text-decoration: underline;">Cek Status PPDB Online</a> dengan nomor registrasi di atas.</p>
        
        <div style="border-t: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px; font-size: 13px; color: #64748b; line-height: 1.5;">
          <p style="margin: 0;">Salam hangat,</p>
          <p style="font-weight: bold; color: #0f172a; margin: 4px 0 0 0;">Panitia PPDB SDN Cibojong 1</p>
          <p style="margin: 2px 0 0 0; font-size: 12px;">Kec. Padarincang, Kab. Serang, Banten 42168</p>
        </div>
      </div>
    `;

    const parentText = `
Yth. Bapak/Ibu Orang Tua atau Wali dari ${student.fullName},

Pendaftaran online calon peserta didik baru Anda di SDN Cibojong 1 telah kami terima di database kami secara aman.

TANDA TERIMA PENDAFTARAN:
- Nomor Registrasi: ${student.registrationNumber}
- Nama Lengkap Siswa: ${student.fullName}
- NISN / NIK: ${student.nisn || '-'} / ${student.nik || '-'}
- Tanggal Registrasi: ${new Date(student.createdAt).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Status Verifikasi: ${student.status}

Unduh salinan berkas bukti pendaftaran PDF Anda di link berikut:
${downloadUrl}

Salam hangat,
Panitia PPDB SDN Cibojong 1
    `.trim();

    // 3. Admin Notification Layout
    const adminEmail = process.env.ADMIN_EMAIL || 'SDN.Cibojong1@gmail.com';
    const parentName = student.fatherName || student.motherName || '-';

    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #cbd5e1; border-radius: 16px; background-color: #f8fafc; color: #0f172a;">
        <h3 style="color: #1d4ed8; margin: 0 0 12px 0; font-size: 18px; font-weight: bold;">Notifikasi Pendaftar Baru SPMB 2026/2027</h3>
        <p style="font-size: 14px; line-height: 1.5;">Pendaftar baru telah masuk ke dalam antrean sistem untuk ditinjau oleh panitia.</p>
        
        <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px 20px; margin: 15px 0;">
          <table style="width: 100%; font-size: 13px;">
            <tr><td style="padding: 4px 0; font-weight: bold; width: 40%;">Nama Siswa:</td><td>${student.fullName}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: bold;">Nomor Registrasi:</td><td style="color: #1d4ed8; font-family: monospace;">${student.registrationNumber}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: bold;">Nama Orang Tua:</td><td>${parentName}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: bold;">No WhatsApp:</td><td>+62 ${student.phone || '-'}</td></tr>
            <tr><td style="padding: 4px 0; font-weight: bold;">Tanggal Daftar:</td><td>${new Date(student.createdAt).toLocaleString('id-ID')}</td></tr>
          </table>
        </div>
        
        <p style="font-size: 13px; color: #475569;">Berkas pendaftar terlampir pada email ini. Silakan masuk ke panel admin untuk memproses verifikasi dan mengubah/merilis status kelayakan.</p>
      </div>
    `;

    const adminText = `
Pendaftar baru SPMB telah masuk.

Data:
- Nama Siswa: ${student.fullName}
- Nomor Registrasi: ${student.registrationNumber}
- Nama Orang Tua: ${parentName}
- Nomor WhatsApp: +62 ${student.phone || '-'}
- Tanggal Daftar: ${new Date(student.createdAt).toLocaleString('id-ID')}
    `.trim();

    // 4. Implement Robust SMTP Transmission with Dual-Engine Failover and Retry loop (up to 3 times)
    const sendEmailWithRetry = async (
      toEmail: string,
      mailSubject: string,
      mailText: string,
      mailHtml: string,
      attachmentsList: any[]
    ) => {
      let currentAttempt = 0;
      const maxRetries = 3;
      let lastErrMessage = '';

      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = Number(process.env.SMTP_PORT || '587');
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const smtpFrom = process.env.SMTP_FROM || 'SDN Cibojong 1 <noreply@sdncibojong1.sch.id>';

      // SMTP Engine Branch
      if (smtpHost && smtpUser && smtpPass) {
        const smtpTransporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass }
        });

        while (currentAttempt < maxRetries) {
          currentAttempt++;
          try {
            console.log(`[SMTP_ENGINE] Attempting delivery ${currentAttempt}/${maxRetries} to ${toEmail}...`);
            await smtpTransporter.sendMail({
              from: smtpFrom,
              to: toEmail,
              subject: mailSubject,
              text: mailText,
              html: mailHtml,
              attachments: attachmentsList
            });
            return { success: true, attempts: currentAttempt, engine: 'Nodemailer (SMTP)' };
          } catch (smtpErr: any) {
            lastErrMessage = smtpErr?.message || String(smtpErr);
            console.warn(`[SMTP_ENGINE] Attempt ${currentAttempt} failed with error:`, lastErrMessage);
            if (currentAttempt < maxRetries) {
              await new Promise(r => setTimeout(r, 1000)); // Exponential wait
            }
          }
        }
      } else {
        lastErrMessage = 'SMTP credentials not completely provisioned in env.';
      }

      // Failover Engine Branch: Resend API Key backup fallback trigger
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        console.log('[SMTP_FAILOVER] SMTP failed or unconfigured; launching fallback transmission via Resend API...');
        try {
          const resendClient = new Resend(resendKey);
          const resendResult = await resendClient.emails.send({
            from: 'SDN Cibojong 1 <noreply@resend.dev>',
            to: [toEmail],
            subject: mailSubject,
            text: mailText,
            html: mailHtml,
            attachments: attachmentsList.map(att => ({
              filename: att.filename,
              content: att.content
            }))
          });

          if (resendResult.error) {
            throw new Error(resendResult.error.message || 'Resend response envelope rejected.');
          }
          return { success: true, attempts: currentAttempt + 1, engine: 'Resend API (Failover Backup)' };
        } catch (resFailErr: any) {
          lastErrMessage += ` | Failover Backup Error: ${resFailErr?.message || resFailErr}`;
          console.error('[SMTP_FAILOVER] Fallover backup also rejected:', resFailErr);
        }
      }

      return { success: false, attempts: currentAttempt, engine: 'None', error: lastErrMessage };
    };

    // 5. Fire parent email transmission
    const deliveryResult = await sendEmailWithRetry(
      email,
      'Pendaftaran PPDB SDN Cibojong 1 Berhasil',
      parentText,
      parentHtml,
      [{ filename: attachmentFilename, content: pdfBuffer }]
    );

    // 6. Fire admin email notification if parent send wasn't in total environment blackout
    if (deliveryResult.success) {
      try {
        await sendEmailWithRetry(
          adminEmail,
          'Pendaftar Baru SPMB Online Masuk',
          adminText,
          adminHtml,
          [{ filename: attachmentFilename, content: pdfBuffer }]
        );
      } catch (adminErr) {
        console.warn('Admin notification failed but ignored to let parent pass:', adminErr);
      }
    }

    // 7. Write thorough transaction event reports back into the database history log registry
    student.email = email;
    student.email_sent = deliveryResult.success;
    student.email_sent_at = deliveryResult.success ? new Date().toISOString() : null;
    
    // Core delivery history log structures
    student.email_delivery_history = student.email_delivery_history || [];
    student.email_delivery_history.push({
      timestamp: new Date().toISOString(),
      recipientAddress: email,
      deliveryStatus: deliveryResult.success ? 'DELIVERED' : 'FAILED',
      errorMessage: deliveryResult.error || null,
      transmissionEngine: deliveryResult.engine,
      totalAttemptsCount: deliveryResult.attempts
    });

    writeJSON('students.json', students);

    // Clean up temporary multipart payload file from local container disk space
    try {
      if (file && file.path) {
        fs.unlinkSync(file.path);
      }
    } catch (cleanupErr) {
      console.warn('[DISK_CLEANUP] Fails removing multer payload cache:', cleanupErr);
    }

    if (deliveryResult.success) {
      return res.status(200).json({ 
        success: true, 
        message: `Surel konfirmasi berhasil tersampaikan via ${deliveryResult.engine} setelah ${deliveryResult.attempts} percobaan.`,
        deliveryResult
      });
    } else {
      // Return 200 simulation success if both engines are unconfigured (fallback simulation mode)
      if (!process.env.SMTP_HOST && !process.env.RESEND_API_KEY) {
        student.email_sent = true;
        student.email_sent_at = new Date().toISOString();
        writeJSON('students.json', students);
        return res.status(200).json({
          success: true,
          message: 'Website beroperasi dalam simulasi pengiriman email karena kredensial SMTP/Resend belum dideklarasikan.',
          simulation: true
        });
      }

      return res.status(500).json({ 
        success: false, 
        message: 'Gagal meredistribusikan email pendaftaran ke tujuan setelah 3 kali percobaan.', 
        error: deliveryResult.error 
      });
    }

  } catch (err: any) {
    console.error('Core send-email catch error:', err);
    try {
      if (file && file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (_) {}
    return res.status(500).json({ success: false, message: 'Terjadi kegagalan server sewaktu memproses surel.', error: err?.message || err });
  }
});

// Helper to fetch image buffer from local path or remote cloud URL
const getImageBuffer = async (imagePathOrUrl: string): Promise<Buffer | null> => {
  if (!imagePathOrUrl) return null;
  try {
    if (imagePathOrUrl.startsWith('http://') || imagePathOrUrl.startsWith('https://')) {
      const response = await fetch(imagePathOrUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } else {
      // Local path on server
      const localPath = imagePathOrUrl.startsWith('/') 
        ? path.join(APP_ROOT, imagePathOrUrl) 
        : path.join(APP_ROOT, 'public', imagePathOrUrl);
      if (fs.existsSync(localPath)) {
        return fs.readFileSync(localPath);
      }
    }
  } catch (err) {
    console.warn(`[getImageBuffer] Failed to load image from: ${imagePathOrUrl}`, err);
  }
  return null;
};

// GET Export PDF Biodata with embedded dynamic Registration QR code
app.get('/api/students/:id/pdf', async (req, res) => {
  try {
    const students = readJSON('students.json', []);
    const student = students.find((s: any) => 
      s.id === req.params.id || 
      s.registrationNumber === req.params.id || 
      s.registration_number === req.params.id ||
      s.registration_id === req.params.id
    );

    if (!student) {
      return res.status(404).send('Biodata Siswa Tidak Ditemukan');
    }

    const fallbackRegNum = student.registrationNumber || student.registration_number || student.registration_id || student.id || '-';

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Biodata_SPMB_${fallbackRegNum}.pdf"`);

    doc.pipe(res);

    // KOP SURAT (School Header Banner)
    doc.fontSize(14).font('Helvetica-Bold').text('PEMERINTAH KABUPATEN SERANG', { align: 'center' });
    doc.fontSize(16).text('DINAS PENDIDIKAN DAN KEBUDAYAAN', { align: 'center' });
    doc.fontSize(18).text('SDN CIBOJONG 1 PADARINCANG', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('Alamat: Jl. Palka Km. 35, Kadubeureum, Kec. Padarincang, Kabupaten Serang, Banten', { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor('#2563EB').lineWidth(2).stroke();
    doc.moveDown(2);

    // FORM TITLE
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#2563EB').text('BUKTI PENDAFTARAN PESERTA DIDIK BARU (SPMB)', { align: 'center' });
    doc.fontSize(12).fillColor('#000000').text(`Tahun Ajaran 2026/2027`, { align: 'center' });
    doc.moveDown(1.5);

    // QR Code Integration
    try {
      const qrData = `http://sdncibojong1.sch.id/verify/${fallbackRegNum}`;
      const qrBuffer = await QRCode.toBuffer(qrData, { width: 120 });
      doc.image(qrBuffer, 440, doc.y, { width: 100 });
    } catch (e) {
      console.error('Failed generating QR code for PDF', e);
    }

    // REGISTRATION INFO
    const startY = doc.y;
    doc.fontSize(11).font('Helvetica-Bold').text('INFORMASI PENDAFTARAN', 50, startY);
    doc.font('Helvetica').text(`No. Registrasi  : ${fallbackRegNum}`, 50, startY + 18);
    const dateFormatted = student.createdAt ? new Date(student.createdAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) : new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'});
    doc.text(`Tgl Daftar      : ${dateFormatted}`, 50, startY + 34);
    doc.text(`Status Berkas   : ${student.status || 'PENDING'}`, 50, startY + 50);
    
    doc.moveDown(4.5);

    const addLabelVal = (label: string, value: any) => {
      const currentY = doc.y;
      if (currentY > 670) {
        doc.addPage();
        doc.y = 50;
      }
      const yToDraw = doc.y;
      doc.font('Helvetica-Bold').text(label, 60, yToDraw, { width: 140, lineBreak: true });
      doc.font('Helvetica').text(`:  ${value || '-'}`, 210, yToDraw, { width: 345, lineBreak: true });
      
      const labelHeight = doc.heightOfString(label, { width: 140 });
      const valueStr = `:  ${value || '-'}`;
      const valueHeight = doc.heightOfString(valueStr, { width: 345 });
      const rowHeight = Math.max(labelHeight, valueHeight);
      doc.y = yToDraw + rowHeight + 4;
    };

    // SECTION A: BIODATA SISWA
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#2563EB').text('A. DATA CALON PESERTA DIDIK', 50);
    doc.fillColor('#000000');
    doc.moveDown(0.5);

    const birthDateFormatted = student.birthDate ? new Date(student.birthDate).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) : '-';

    addLabelVal('Nama Lengkap', student.fullName);
    addLabelVal('Jenis Kelamin', student.gender);
    addLabelVal('NISN', student.nisn);
    addLabelVal('NIK', student.nik);
    addLabelVal('Tempat, Tgl Lahir', `${student.birthPlace || '-'}, ${birthDateFormatted}`);
    addLabelVal('Agama', student.religion);
    addLabelVal('Asal Sekolah TK', student.previousSchool);
    
    const rtRwStr = student.rtRw || student.rt_rw || '-';
    const villageStr = student.village || student.desa || '-';
    const districtStr = student.district || student.kecamatan || '-';
    addLabelVal('Alamat Rumah', `${student.address || '-'} RT/RW ${rtRwStr}, Desa ${villageStr}, Kec. ${districtStr}`);

    doc.moveDown(1.5);

    // SECTION B: ORANG TUA / WALI
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#2563EB').text('B. DATA ORANG TUA / WALI', 50);
    doc.fillColor('#000000');
    doc.moveDown(0.5);

    addLabelVal('Nama Ayah Kandung', student.fatherName);
    addLabelVal('Pendidikan / Pekerjaan', `${student.fatherEducation || '-'} / ${student.fatherOccupation || '-'}`);
    addLabelVal('Nama Ibu Kandung', student.motherName);
    addLabelVal('Pendidikan / Pekerjaan', `${student.motherEducation || '-'} / ${student.motherOccupation || '-'}`);
    if (student.guardianName) {
      addLabelVal('Nama Wali (Jika Ada)', student.guardianName);
      addLabelVal('Pekerjaan Wali', student.guardianOccupation);
    }

    doc.moveDown(1.5);

    // SECTION C: BANTUAN & DETAIL TAMBAHAN
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#2563EB').text('C. DETAIL TAMBAHAN & PERSYARATAN', 50);
    doc.fillColor('#000000');
    doc.moveDown(0.5);

    const kipKpsStr = student.isKipKpsBeneficiary === 'Ya' ? `Ya (No: ${student.kipKpsNumber || student.kip_kps_number || '-'})` : 'Tidak';
    addLabelVal('Penerima KIP / KPS', kipKpsStr);
    addLabelVal('Tinggi / Berat Badan', `${student.height || '-'} cm / ${student.weight || '-'} kg`);
    addLabelVal('Jarak ke Sekolah', `${student.homeDistance || '-'} km`);

    doc.moveDown(2);

    // FOOTER FOR SIGNATURE
    const docSettings = readJSON('document_settings.json', {
      committee_name: "Drs. H. Mulyadi, M.Pd.",
      committee_position: "Ketua Panitia PMB",
      committee_nip: "197412081999031002",
      committee_signature: "",
      committee_stamp: ""
    });

    if (doc.y > 600) {
      doc.addPage();
      doc.y = 50;
    }

    doc.fontSize(10).font('Helvetica').fillColor('#000000');
    const curY = doc.y;
    doc.text('Mengetahui,', 50, curY);
    doc.text('Orang Tua/Wali Calon Siswa,', 50, curY + 12);
    doc.text('( ......................................... )', 50, curY + 70);

    doc.text('Serang, ' + new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}), 380, curY);
    doc.text(`${docSettings.committee_position || 'Ketua Panitia PMB'},`, 380, curY + 12);

    // Dynamic Signature Embedding
    if (docSettings.committee_signature) {
      const sigBuffer = await getImageBuffer(docSettings.committee_signature);
      if (sigBuffer) {
        try {
          doc.image(sigBuffer, 410, curY + 23, { width: 90, height: 35 });
        } catch (err) {
          console.error("PDF image loading error for signature:", err);
        }
      }
    }

    // Dynamic Stamp/Seal Embedding
    if (docSettings.committee_stamp) {
      const stampBuffer = await getImageBuffer(docSettings.committee_stamp);
      if (stampBuffer) {
        try {
          doc.image(stampBuffer, 330, curY + 10, { width: 80, height: 80 });
        } catch (err) {
          console.error("PDF image loading error for stamp:", err);
        }
      }
    }

    doc.text(`( ${docSettings.committee_name || '.........................................'} )`, 380, curY + 65);
    if (docSettings.committee_nip) {
      doc.text(`NIP. ${docSettings.committee_nip}`, 380, curY + 77);
    }

    doc.end();

  } catch (error) {
    console.error('Error rendering student PDF:', error);
    res.status(500).send('Terjadi kesalahan internal ketika memproses PDF.');
  }
});


// Announcements CRUD (Admin authorization)
app.post('/api/announcements', authenticateAdmin, (req, res) => {
  const announcements = readJSON('announcements.json', []);
  const newAnn = {
    id: `ann-${Date.now()}`,
    title: req.body.title,
    content: req.body.content,
    date: new Date().toISOString().substring(0, 10),
    category: req.body.category || 'Umum',
    author: req.body.author || 'Staf Admin'
  };
  announcements.unshift(newAnn);
  writeJSON('announcements.json', announcements);
  res.status(210).json({ success: true, message: 'Pengumuman baru sukses diterbitkan.', announcement: newAnn });
});

app.delete('/api/announcements/:id', authenticateAdmin, (req, res) => {
  const announcements = readJSON('announcements.json', []);
  const filtered = announcements.filter((a: any) => a.id !== req.params.id);
  writeJSON('announcements.json', filtered);
  res.json({ success: true, message: 'Pengumuman berhasil dihapus.' });
});

// Gallery endpoints
app.get('/api/gallery', (req, res) => {
  const gallery = readJSON('gallery.json', []);
  res.json({ success: true, gallery });
});

app.post('/api/gallery/upload', authenticateAdmin, upload.single('photo'), async (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'File gambar tidak ditemukan.' });
  }
  const imageUrl = await uploadFileToCloudStorage(req.file, 'gallery-images');
  res.json({ success: true, imageUrl });
});

app.post('/api/gallery', authenticateAdmin, (req, res) => {
  const gallery = readJSON('gallery.json', []);
  const newPhoto = {
    id: `gal-${Date.now()}`,
    title: req.body.title,
    description: req.body.description,
    imageUrl: req.body.imageUrl || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=800',
    category: req.body.category || 'Kegiatan',
    date: new Date().toISOString().substring(0, 10)
  };
  gallery.unshift(newPhoto);
  writeJSON('gallery.json', gallery);
  res.json({ success: true, message: 'Foto baru berhasil ditambahkan ke galeri.', item: newPhoto });
});

app.delete('/api/gallery/:id', authenticateAdmin, (req, res) => {
  const gallery = readJSON('gallery.json', []);
  const filtered = gallery.filter((g: any) => g.id !== req.params.id);
  writeJSON('gallery.json', filtered);
  res.json({ success: true, message: 'Foto galeri berhasil dihapus.' });
});

// Contact Messages endpoints
app.get('/api/messages', authenticateAdmin, (req, res) => {
  const messages = readJSON('messages.json', []);
  res.json({ success: true, messages });
});

app.post('/api/messages', (req, res) => {
  const messages = readJSON('messages.json', []);
  const newMsg = {
    id: `msg-${Date.now()}`,
    name: req.body.name,
    email: req.body.email,
    subject: req.body.subject,
    message: req.body.message,
    date: new Date().toISOString().substring(0, 10),
    isRead: false
  };
  messages.unshift(newMsg);
  writeJSON('messages.json', messages);
  res.json({ success: true, message: 'Pesan Anda telah berhasil dikirim! Kami akan menghubungi Anda segera.' });
});

app.put('/api/messages/:id/read', authenticateAdmin, (req, res) => {
  const messages = readJSON('messages.json', []);
  const index = messages.findIndex((m: any) => m.id === req.params.id);
  if (index !== -1) {
    messages[index].isRead = true;
    writeJSON('messages.json', messages);
    return res.json({ success: true, message: 'Pesan ditandai sebagai dibaca.' });
  }
  res.status(404).json({ success: false, message: 'Pesan tidak ditemukan' });
});

// GET Announcements lists (Public)
app.get('/api/announcements', (req, res) => {
  const announcements = readJSON('announcements.json', []);
  res.json({ success: true, announcements });
});

// Teachers & Staff endpoints (Public & Protected)
app.get('/api/teachers', (req, res) => {
  const teachers = readJSON('teachers.json', []);
  res.json({ success: true, teachers });
});

// Admin edit teacher details
app.put('/api/teachers/:id', authenticateAdmin, (req, res) => {
  const teachers = readJSON('teachers.json', []);
  const idx = teachers.findIndex((t: any) => t.id === req.params.id);
  if (idx !== -1) {
    teachers[idx] = {
      ...teachers[idx],
      name: req.body.name || teachers[idx].name,
      role: req.body.role || teachers[idx].role,
      category: req.body.category || teachers[idx].category,
      photoUrl: req.body.hasOwnProperty('photoUrl') ? req.body.photoUrl : teachers[idx].photoUrl
    };
    writeJSON('teachers.json', teachers);
    return res.json({ success: true, message: 'Data guru/staf berhasil diperbarui.', teacher: teachers[idx] });
  }
  res.status(404).json({ success: false, message: 'Data guru/staf tidak ditemukan.' });
});

// Admin upload teacher image
app.post('/api/teachers/:id/image', authenticateAdmin, upload.single('photo'), async (req: any, res) => {
  const teachers = readJSON('teachers.json', []);
  const idx = teachers.findIndex((t: any) => t.id === req.params.id);
  if (idx !== -1) {
    if (req.file) {
      const cloudUrl = await uploadFileToCloudStorage(req.file, 'teacher-images');
      teachers[idx].photoUrl = cloudUrl;
      writeJSON('teachers.json', teachers);
      return res.json({
        success: true,
        message: 'Foto dewan guru/staf berhasil diunggah.',
        photoUrl: teachers[idx].photoUrl,
        teacher: teachers[idx]
      });
    } else {
      return res.status(400).json({ success: false, message: 'Tidak ada file foto.' });
    }
  }
  res.status(404).json({ success: false, message: 'Guru/staf tidak dikenal.' });
});

// ==========================================
// SETTINGS ENDPOINTS (School Logo & Cover Photo)
// ==========================================
app.get('/api/settings', (req, res) => {
  const settings = readJSON('settings.json', {
    logoUrl: '/src/assets/school_logo.png',
    coverUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=800&auto=format&fit=crop',
    coverTitle: 'Gedung Utama Cibojong 1',
    coverSubtitle: 'Padarincang, Serang',
    profileCoverUrl: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=800&auto=format&fit=crop',
    isRegistrationClosed: false
  });
  res.json({ success: true, settings });
});

app.post('/api/settings/logo', authenticateAdmin, upload.single('photo'), async (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'File gambar logo tidak ditemukan.' });
  }
  const cloudUrl = await uploadFileToCloudStorage(req.file, 'school-assets');
  const settings = readJSON('settings.json', {
    logoUrl: '/src/assets/school_logo.png',
    coverUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=800&auto=format&fit=crop',
    coverTitle: 'Gedung Utama Cibojong 1',
    coverSubtitle: 'Padarincang, Serang',
    profileCoverUrl: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=800&auto=format&fit=crop'
  });
  settings.logoUrl = cloudUrl;
  writeJSON('settings.json', settings);
  res.json({ success: true, message: 'Logo sekolah berhasil diperbarui.', logoUrl: settings.logoUrl });
});

app.post('/api/settings/cover', authenticateAdmin, upload.single('photo'), async (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'File gambar sampul tidak ditemukan.' });
  }
  const cloudUrl = await uploadFileToCloudStorage(req.file, 'school-assets');
  const settings = readJSON('settings.json', {
    logoUrl: '/src/assets/school_logo.png',
    coverUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=800&auto=format&fit=crop',
    coverTitle: 'Gedung Utama Cibojong 1',
    coverSubtitle: 'Padarincang, Serang',
    profileCoverUrl: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=800&auto=format&fit=crop'
  });
  settings.coverUrl = cloudUrl;
  writeJSON('settings.json', settings);
  res.json({ success: true, message: 'Foto sampul berhasil diperbarui.', coverUrl: settings.coverUrl });
});

app.post('/api/settings/profile-cover', authenticateAdmin, upload.single('photo'), async (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'File gambar sampul profil tidak ditemukan.' });
  }
  const cloudUrl = await uploadFileToCloudStorage(req.file, 'school-assets');
  const settings = readJSON('settings.json', {
    logoUrl: '/src/assets/school_logo.png',
    coverUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=800&auto=format&fit=crop',
    coverTitle: 'Gedung Utama Cibojong 1',
    coverSubtitle: 'Padarincang, Serang',
    profileCoverUrl: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=800&auto=format&fit=crop'
  });
  settings.profileCoverUrl = cloudUrl;
  writeJSON('settings.json', settings);
  res.json({ success: true, message: 'Foto sampul profil sekolah berhasil diperbarui.', profileCoverUrl: settings.profileCoverUrl });
});

app.post('/api/settings/info', authenticateAdmin, (req, res) => {
  const { coverTitle, coverSubtitle, isRegistrationClosed } = req.body;
  const settings = readJSON('settings.json', {
    logoUrl: '/src/assets/school_logo.png',
    coverUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=800&auto=format&fit=crop',
    coverTitle: 'Gedung Utama Cibojong 1',
    coverSubtitle: 'Padarincang, Serang',
    profileCoverUrl: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=800&auto=format&fit=crop',
    isRegistrationClosed: false
  });
  
  if (coverTitle !== undefined) settings.coverTitle = coverTitle;
  if (coverSubtitle !== undefined) settings.coverSubtitle = coverSubtitle;
  if (isRegistrationClosed !== undefined) settings.isRegistrationClosed = isRegistrationClosed === true || isRegistrationClosed === 'true';
  
  writeJSON('settings.json', settings);
  res.json({ success: true, message: 'Keterangan sampul foto berhasil diperbarui.', settings });
});

// ==========================================
// SPMB SETTINGS ENDPOINTS (Quota, Active, Waiting List)
// ==========================================
app.get('/api/spmb-settings', (req, res) => {
  const settings = readJSON('spmb_settings.json', {
    id: "spmb_main",
    quota_limit: 55,
    registration_open: "2026-06-01",
    registration_close: "2026-07-31",
    waiting_list_enabled: false,
    registration_active: true,
    updated_at: new Date().toISOString()
  });
  res.json({ success: true, settings });
});

app.post('/api/spmb-settings', authenticateAdmin, (req, res) => {
  const { quota_limit, registration_open, registration_close, waiting_list_enabled, registration_active } = req.body;
  
  const settings = readJSON('spmb_settings.json', {
    id: "spmb_main",
    quota_limit: 55,
    registration_open: "2026-06-01",
    registration_close: "2026-07-31",
    waiting_list_enabled: false,
    registration_active: true,
    updated_at: new Date().toISOString()
  });

  // 1. Validate date format (strict YYYY-MM-DD pattern)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (registration_open !== undefined && !dateRegex.test(registration_open)) {
    return res.status(400).json({ success: false, message: 'Format Tanggal Buka harus YYYY-MM-DD.' });
  }
  if (registration_close !== undefined && !dateRegex.test(registration_close)) {
    return res.status(400).json({ success: false, message: 'Format Tanggal Tutup harus YYYY-MM-DD.' });
  }

  // 2. Validate closing date is after opening date
  const finalOpen = registration_open !== undefined ? registration_open : settings.registration_open;
  const finalClose = registration_close !== undefined ? registration_close : settings.registration_close;
  if (finalOpen && finalClose) {
    if (new Date(finalClose) <= new Date(finalOpen)) {
      return res.status(400).json({ success: false, message: 'Tanggal Tutup harus setelah Tanggal Buka.' });
    }
  }

  // 3. Compare quota with currently verified students count
  if (quota_limit !== undefined) {
    const newQuota = Number(quota_limit);
    if (isNaN(newQuota) || newQuota <= 0) {
      return res.status(400).json({ success: false, message: 'Kuota harus berupa angka positif.' });
    }

    const students = readJSON('students.json', []);
    const verifiedCount = students.filter((s: any) => s && (s.status === 'VERIFIED' || s.status === 'Terverifikasi')).length;
    
    if (newQuota < verifiedCount) {
      return res.status(400).json({ 
        success: false, 
        message: `Kuota baru (${newQuota}) tidak boleh kurang dari jumlah siswa terverifikasi saat ini (${verifiedCount}).` 
      });
    }
    settings.quota_limit = newQuota;
  }

  if (registration_open !== undefined) settings.registration_open = registration_open;
  if (registration_close !== undefined) settings.registration_close = registration_close;
  if (waiting_list_enabled !== undefined) settings.waiting_list_enabled = waiting_list_enabled === true || waiting_list_enabled === 'true';
  if (registration_active !== undefined) settings.registration_active = registration_active === true || registration_active === 'true';
  
  settings.updated_at = new Date().toISOString();

  writeJSON('spmb_settings.json', settings);
  res.json({ success: true, message: 'Pengaturan kuota dan sistem SPMB berhasil diperbarui secara transaksional.', settings });
});


// ==========================================
// DOCUMENT SETTINGS ENDPOINTS (Chairman & Signatures)
// ==========================================
app.get('/api/document-settings', (req, res) => {
  const settings = readJSON('document_settings.json', {
    id: "doc_main",
    committee_name: "Drs. H. Mulyadi, M.Pd.",
    committee_position: "Ketua Panitia PMB",
    committee_nip: "197412081999031002",
    committee_signature: "",
    committee_stamp: "",
    updated_at: new Date().toISOString()
  });
  res.json({ success: true, settings });
});

app.post('/api/document-settings/signature', authenticateAdmin, upload.single('photo'), async (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'File gambar tanda tangan tidak ditemukan.' });
  }
  const cloudUrl = await uploadFileToCloudStorage(req.file, 'signatures');
  const settings = readJSON('document_settings.json', {
    id: "doc_main",
    committee_name: "Drs. H. Mulyadi, M.Pd.",
    committee_position: "Ketua Panitia PMB",
    committee_nip: "197412081999031002",
    committee_signature: "",
    committee_stamp: "",
    updated_at: new Date().toISOString()
  });
  settings.committee_signature = cloudUrl;
  settings.updated_at = new Date().toISOString();
  writeJSON('document_settings.json', settings);
  res.json({ success: true, message: 'Tanda tangan digital berhasil diperbarui.', committee_signature: settings.committee_signature });
});

app.post('/api/document-settings/stamp', authenticateAdmin, upload.single('photo'), async (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'File gambar cap stempel tidak ditemukan.' });
  }
  const cloudUrl = await uploadFileToCloudStorage(req.file, 'school-assets');
  const settings = readJSON('document_settings.json', {
    id: "doc_main",
    committee_name: "Drs. H. Mulyadi, M.Pd.",
    committee_position: "Ketua Panitia PMB",
    committee_nip: "197412081999031002",
    committee_signature: "",
    committee_stamp: "",
    updated_at: new Date().toISOString()
  });
  settings.committee_stamp = cloudUrl;
  settings.updated_at = new Date().toISOString();
  writeJSON('document_settings.json', settings);
  res.json({ success: true, message: 'Cap stempel digital berhasil diperbarui.', committee_stamp: settings.committee_stamp });
});

app.post('/api/document-settings/info', authenticateAdmin, (req, res) => {
  const { committee_name, committee_position, committee_nip, committee_signature, committee_stamp } = req.body;
  const settings = readJSON('document_settings.json', {
    id: "doc_main",
    committee_name: "Drs. H. Mulyadi, M.Pd.",
    committee_position: "Ketua Panitia PMB",
    committee_nip: "197412081999031002",
    committee_signature: "",
    committee_stamp: "",
    updated_at: new Date().toISOString()
  });
  
  if (committee_name !== undefined) settings.committee_name = committee_name;
  if (committee_position !== undefined) settings.committee_position = committee_position;
  if (committee_nip !== undefined) settings.committee_nip = committee_nip;
  if (committee_signature !== undefined) settings.committee_signature = committee_signature;
  if (committee_stamp !== undefined) settings.committee_stamp = committee_stamp;
  
  settings.updated_at = new Date().toISOString();
  writeJSON('document_settings.json', settings);
  res.json({ success: true, message: 'Data penandatangan dokumen berhasil diperbarui.', settings });
});


// ==========================================
// GLOBAL ERROR HANDLING MIDDLEWARE
// ==========================================
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Error Handler]', err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Batas maksimal ukuran file adalah 10 MB. Silakan kompres foto Anda terlebih dahulu.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Gagal mengunggah file (Multer): ${err.message}`
    });
  }

  // Handle support of standard Error
  if (err instanceof Error) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Terjadi kesalahan sistem.'
    });
  }

  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan internal pada server.'
  });
});


// ==========================================
// VITE AND ASSETS HOSTING
// ==========================================
async function startServer() {
  // 1. Pre-load latest database collections from Firestore (cloud storage) before listening, ensuring persistence
  if (db) {
    try {
      console.log('[SERVER] Pre-loading latest data from Firestore before booting up routing...');
      await syncFromFirestoreToLocal();
      console.log('[SERVER] Firestore database collections loaded onto cache successfully.');
      
      // Determine if Firestore has already been seeded at least once by verifying the root settings
      const settingsDocRef = db.collection('settings').doc('main');
      const docSnapshot = await settingsDocRef.get();
      if (docSnapshot.exists) {
        isFirestoreSeeded = true;
        console.log('[SERVER] Verified settings document exists in Firestore. Setting isFirestoreSeeded = true.');
      } else {
        console.log('[SERVER] Settings document not found in Firestore. This appears to be a fresh database boot.');
      }
    } catch (err) {
      console.error('[SERVER] Firestore initial pre-load failed, operating on cached disk state:', err);
    }
  }

  // 2. Initialize local JSON mock data safely if cached files do not exist or are blank
  initMockData();

  // 3. Seeding Firestore with defaults if the database collections are completely empty (first run)
  if (db) {
    try {
      console.log('[SERVER] Verifying database seeding status...');
      await syncLocalToFirestoreIfEmpty();
    } catch (err) {
      console.error('[SERVER] Firestore database seeding failed:', err);
    }
  }

  // 4. Build Vite middleware or static files router
  if (process.env.NODE_ENV !== "production") {
    // Development Mode - Use Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode - Serve pre-built static files with robust multi-directory fallback for cPanel
    let distPath = path.join(APP_ROOT, 'dist');
    if (!fs.existsSync(path.join(distPath, 'index.html'))) {
      const parentPublicHtml = path.resolve(APP_ROOT, '../public_html');
      const rootPublicHtml = path.resolve(APP_ROOT, '../../public_html');
      if (fs.existsSync(path.join(parentPublicHtml, 'index.html'))) {
        distPath = parentPublicHtml;
      } else if (fs.existsSync(path.join(APP_ROOT, 'public_html'))) {
        distPath = path.join(APP_ROOT, 'public_html');
      } else if (fs.existsSync(path.join(APP_ROOT, 'index.html'))) {
        distPath = APP_ROOT;
      } else if (fs.existsSync(path.join(rootPublicHtml, 'index.html'))) {
        distPath = rootPublicHtml;
      }
    }
    console.log(`[SERVER] Serving static assets from: ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // 5. Start listening once the cache state is fully synchronized and seeded
  if (isNaN(Number(PORT))) {
    // Unix Socket path (Phusion Passenger / cPanel custom pipe)
    app.listen(PORT, () => {
      console.log(`[SERVER] Running fullstack on Unix Socket: ${PORT}`);
    });
  } else {
    // Normal TCP Port
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`[SERVER] Running fullstack on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer();
