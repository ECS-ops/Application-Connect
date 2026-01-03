
import { ApplicationData, AppStatus, LotteryStatus, DuplicateFinding, DashboardStats, User, UserRole, Project, AuditLogEntry, DriveConfig, DocumentVersion, BrandingConfig, AdminSettings, DefaultRejectionReasons, LifecycleStage } from '../types';
import { ApiService } from './apiService';

// ==========================================
// CONFIGURATION
// ==========================================
// Set to TRUE for Production Deployment.
// This connects the frontend to the Node.js/SQLite backend for persistent storage and multi-user login.
const USE_PRODUCTION_API = true; 

// Mock Password Hashing (For Simulation Mode only fallback)
// Matches "password123" -> "cGFzc3dvcmQxMjM="
const hashPassword = (pwd: string): string => btoa(pwd);

// Mock Users Database (Fallback only - used if API fails)
let USERS: User[] = [
  { username: 'admin', password: hashPassword('password123'), fullName: 'System Administrator', role: UserRole.ADMIN, isActive: true },
  { username: 'deo1', password: hashPassword('password123'), fullName: 'Rajesh Verma (Data Entry)', role: UserRole.DEO, isActive: true },
  { username: 'val1', password: hashPassword('password123'), fullName: 'Amit Singh (Verification Officer)', role: UserRole.VALIDATOR, isActive: true },
  { username: 'viewer1', password: hashPassword('password123'), fullName: 'Sneha Patel (Dashboard View)', role: UserRole.VIEWER, isActive: true },
];

// Mock Projects Database (Fallback)
let PROJECTS: Project[] = [
    { id: 'PROJ-001', name: 'application Phase 1 (City Center)', description: 'Primary housing scheme for city center blocks.', isActive: true, createdAt: new Date().toISOString() },
    { id: 'PROJ-002', name: 'Ghatkopar Renewal 2.0', description: 'Slum rehabilitation project.', isActive: true, createdAt: new Date().toISOString() }
];

let ACTIVE_PROJECT_ID: string | null = null;
let BANNED_IPS: any[] = [];
let DRIVE_CONFIG: DriveConfig = { clientId: '', clientSecret: '', rootFolderId: '', isConnected: false };
let BRANDING_CONFIG: BrandingConfig = { logoUrl: '', loginHeader: 'Application-Connect', loginSubtitle: 'Housing for All Initiative', loginFooter: 'Secure Portal', loginBackgroundUrl: '', sidebarTitle: 'Application Management', sidebarVersion: '1.0', primaryColor: '#0ea5e9' };

// Detailed HTML Template for Consent Form
const DEFAULT_CONSENT_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Arial', sans-serif; padding: 40px; color: #333; line-height: 1.6; max-width: 800px; margin: 0 auto; }
  .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; position: relative; min-height: 80px; }
  .logo-container { position: absolute; top: 0; left: 0; }
  .logo-img { max-height: 80px; max-width: 120px; object-fit: contain; }
  .org-name { font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-top: 10px; padding-left: 100px; padding-right: 100px; }
  .sub-header { font-size: 16px; color: #555; margin-top: 5px; font-weight: bold; }
  .content { margin-bottom: 40px; }
  .row { display: flex; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
  .label { font-weight: bold; width: 220px; color: #444; }
  .value { flex: 1; font-weight: 500; color: #000; font-family: 'Courier New', monospace; font-size: 16px; }
  .declaration { background: #f9f9f9; padding: 15px; border: 1px solid #ddd; font-size: 15px; text-align: justify; margin-top: 30px; border-radius: 4px; }
  .footer { margin-top: 80px; display: flex; justify-content: space-between; align-items: flex-end; }
  .sig-box { text-align: center; }
  .sig-line { border-top: 1px solid #000; width: 200px; margin-bottom: 8px; }
  .timestamp { font-size: 10px; color: #999; margin-top: 50px; text-align: center; border-top: 1px dashed #ccc; padding-top: 10px; }
  @media print {
    body { padding: 0; }
    .declaration { background: none; border: 1px solid #000; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="logo-container" style="display: {{LOGO_DISPLAY}};">
       <img src="{{LOGO_URL}}" class="logo-img" alt="Logo" />
    </div>
    <div class="org-name">Kulgaon-Badlapur Municipal Council (KBMC)</div>
    <div class="sub-header">Pradhan Mantri Awas Yojana (Urban)</div>
    <div class="sub-header">Application Acknowledgement Receipt & Consent Form</div>
  </div>

  <div class="content">
    <div class="row"><span class="label">Application Number:</span> <span class="value">{{APP_ID}}</span></div>
    <div class="row"><span class="label">Date of Receipt:</span> <span class="value">{{RECEIPT_DATE}}</span></div>
    <div class="row"><span class="label">Applied for Project:</span> <span class="value">{{PROJECT_NAME}}</span></div>
    <div class="row"><span class="label">Applicant Name:</span> <span class="value">{{APPLICANT_NAME}}</span></div>
    <div class="row"><span class="label">Category:</span> <span class="value">{{CATEGORY}}</span></div>
    <div class="row"><span class="label">Aadhaar Number:</span> <span class="value">{{AADHAAR}}</span></div>
    <div class="row"><span class="label">Primary Mobile:</span> <span class="value">{{PHONE_PRIMARY}}</span></div>
   </div>

  <div class="declaration">
    <strong>Consent for Aadhaar Authentication:</strong><br/><br/>

    a) I hereby state that I have no objection in authenticating myself with Aadhaar based authentication system and give consent to provide my Aadhaar number, Biometric and/or One Time Password (OTP) data for Aadhaar based authentication for the purposes of availing benefits of owning a pucca house under Pradhan Mantri Awas Yojana - Urban 1.0 (PMAY-U 1.0). I understand that the Aadhaar number, Biometrics and/or OTP provided for authentication shall be used:<br/><br/>
       i. for authenticating my identity and<br/><br/>
       ii. for de-duplication with the previous housing Scheme, PMAY-U 1.0 (all verticals including Interest Subsidy Scheme) and also for de-duplication with other housing schemes such as PMAY (Gramin), any State sponsored housing schemes etc.<br/><br/>
    b) I understand that PMAY-U 1.0, Ministry of Housing and Urban Affairs, Government of India shall ensure security and confidentiality of my personal identity data provided for the purpose of Aadhaar based authentication.<br/><br/>
    c) I hereby declare that the information provided hereunder is correct.
  </div>

  <div class="declaration">
    <strong>Consent Declaration:</strong><br/><br/>
    1. That there is no pucca house in my name or any family member name in any part of India.<br/><br/>
    2. I belong to EWS category, as my annual household income from all sources is up to 3,00,000/- (Rupees Three lakh Only)<br/><br/>
    3. That I or my family member have not availed benefits under any other housing Scheme of the Government of India or State Government in last 20 years.<br/><br/>
    4. That I am willing to contribute my share of money for the construction of my house under PMAYU 1.0, within stipulated time period as mentioned by the Authority.<br/><br/>
    5. That I shall not sell-out/transfer the flat/house constructed under PMAY-U 1.0 Scheme for a period of Five (5) years from the date of registration of my flat/house.<br/><br/>
    6. That I shall use the house/flat constructed under PMAY-U 1.0 Scheme only for residential purpose and shall not use for any other activities.<br/><br/>
    7. That I shall adhere to all terms and conditions of the PMAY-U 1.0 Scheme.<br/><br/>
    8. That I have not applied/availed benefit under any other vertical of PMAY-U 1.0 or PMAY-G or PMAY-U 2.0.<br/><br/>
    मी याद्वारे घोषित करतो की, माझ्या माहितीनुसार आणि विश्वासानुसार, माझ्याद्वारे प्रदान केलेली सर्व कागदपत्रे आणि माहिती सत्य आणि अचूक आहे. मला हे देखील समजले आहे की, पात्रतेच्या अटींचे पालन न केल्यास किंवा खोटी माहिती सादर केल्यास कायदेशीर परिणाम होतील, ज्यात पीएमएवाय-यू १.० योजनेतून अपात्र ठरवणे आणि या योजनेअंतर्गत आधीच मिळालेल्या कोणत्याही लाभां
  </div>

  <div class="footer">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div>Signature of Operator</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div>Signature of Applicant</div>
    </div>
  </div>

  <div class="timestamp">
    System Generated Receipt • Printed on: {{CURRENT_DATE}} • Valid without seal for reference
  </div>
</body>
</html>
`;

let ADMIN_SETTINGS: AdminSettings = { 
    documentChecklist: [
      'Aadhaar Card (Applicant & Family)',
      'Applicant Photo',
      'PAN Card (Applicant & Co-applicant)',
      'Income Proof',
      'Caste Certificate',
      'Bank Details',
      'Rental Agreement',
      'Disability Certificate',
      'Consent Form'
    ], 
    rejectionReasons: Object.values(DefaultRejectionReasons), 
    timezone: 'Asia/Kolkata', 
    scannerDeviceName: 'Canon DR-C225', 
    retentionPeriodDays: 3650, 
    duplicateThreshold: 0.88, 
    consentFormTemplate: DEFAULT_CONSENT_TEMPLATE 
};

// --- HELPER TO GENERATE DUMMY DATA ---
const generateMockData = (): ApplicationData[] => {
    return []; // Production mode should start empty or pull from API
};

// Initialize with Generated Data
let APPLICATIONS: ApplicationData[] = generateMockData();

const simulateLatency = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

export const DataService = {
  // --- Auth & User ---
  authenticate: async (username: string, password: string): Promise<User | undefined> => {
      // 1. Try Production API first (Only if Enabled)
      if (USE_PRODUCTION_API) {
          try {
              const res = await ApiService.login(username, password);
              localStorage.setItem('application_token', res.token);
              console.log("LOGIN SUCCESS: Via Backend API");
              return { ...res.user, isActive: true };
          } catch (e: any) {
              console.warn("API Login Failed (falling back to local mock):", e.message);
              alert("Connection to server failed. Check internet connection.");
          }
      }
      
      // 2. Mock Logic (Robust Fallback)
      const hashedPassword = hashPassword(password);
      const user = USERS.find(u => u.username === username && u.password === hashedPassword && u.isActive);
      
      if (user) {
          console.log("LOGIN SUCCESS: Via Local Simulation (Offline Mode)");
          await simulateLatency(500); // Simulate network feel
      } else {
          console.warn("LOGIN FAILED: Local Simulation check failed. Check credentials.");
      }
      return user;
  },

  getUsers: (): User[] => [...USERS], 

  addUser: (user: User): void => {
    USERS.push({ ...user, password: hashPassword(user.password) });
  },

  updateUser: (username: string, updates: Partial<User>): void => {
      const idx = USERS.findIndex(u => u.username === username);
      if (idx !== -1) USERS[idx] = { ...USERS[idx], ...updates };
  },

  deleteUser: (username: string): void => {
      USERS = USERS.filter(u => u.username !== username);
  },

  // --- Project Management ---
  getProjects: (): Project[] => {
      return [...PROJECTS];
  },
  
  addProject: (project: Project): void => {
      PROJECTS.push(project);
  },

  updateProject: (id: string, updates: Partial<Project>): void => {
      const idx = PROJECTS.findIndex(p => p.id === id);
      if (idx !== -1) {
          PROJECTS[idx] = { ...PROJECTS[idx], ...updates };
      }
  },

  setActiveProject: (projectId: string | null) => {
      ACTIVE_PROJECT_ID = projectId;
  },

  getActiveProject: (): Project | undefined => {
      return PROJECTS.find(p => p.id === ACTIVE_PROJECT_ID);
  },

  // --- Security & Bans ---
  getBannedIps: async (): Promise<any[]> => {
      try {
          if (USE_PRODUCTION_API) {
              return await ApiService.getBannedIps();
          }
      } catch (e) { console.warn("API Error", e); }
      return BANNED_IPS;
  },

  unlockIp: async (ip: string): Promise<void> => {
      try {
          if (USE_PRODUCTION_API) {
              await ApiService.unlockIp(ip);
              return;
          }
      } catch (e) { console.warn("API Error", e); }
      BANNED_IPS = BANNED_IPS.filter(b => b.ip_address !== ip);
  },

  // --- Branding & Config ---
  getBrandingConfig: (): BrandingConfig => ({ ...BRANDING_CONFIG }),
  updateBrandingConfig: (config: BrandingConfig): void => { BRANDING_CONFIG = { ...config }; },
  getDriveConfig: (): DriveConfig => ({ ...DRIVE_CONFIG }),
  updateDriveConfig: (config: Partial<DriveConfig>): void => { DRIVE_CONFIG = { ...DRIVE_CONFIG, ...config }; },
  getAdminSettings: (): AdminSettings => ({ ...ADMIN_SETTINGS }),
  updateAdminSettings: (settings: AdminSettings): void => { ADMIN_SETTINGS = { ...settings }; },

  // --- Application Data Management ---
  
  getApplications: (): ApplicationData[] => {
      if (!ACTIVE_PROJECT_ID) return [];
      return APPLICATIONS.filter(app => app.projectId === ACTIVE_PROJECT_ID);
  },

  getAllApplicationsGlobal: (): ApplicationData[] => {
      return [...APPLICATIONS];
  },
  
  syncApplications: async (): Promise<void> => {
      if (USE_PRODUCTION_API) {
          try {
              const apps = await ApiService.getApplications();
              APPLICATIONS = apps;
              // Also sync projects if possible in future API
              try {
                  const projs = await ApiService.getProjects();
                  if(projs && projs.length > 0) PROJECTS = projs;
              } catch(e) { console.warn("Could not sync projects"); }

          } catch (e) {
              console.warn("Failed to sync applications from backend");
          }
      }
  },
  
  getApplicationById: (id: string): ApplicationData | undefined => APPLICATIONS.find(a => a.id === id),
  
  checkApplicationExists: async (id: string): Promise<boolean> => {
    if (USE_PRODUCTION_API) {
        try {
            return await ApiService.checkApplicationExists(id);
        } catch (e) { return !!APPLICATIONS.find(a => a.id === id); }
    }
    await simulateLatency(300);
    return !!APPLICATIONS.find(a => a.id === id);
  },

  saveApplication: async (app: ApplicationData): Promise<void> => {
    if (USE_PRODUCTION_API) {
        try {
            await ApiService.saveApplication(app);
            // Optimistic update
            const index = APPLICATIONS.findIndex(a => a.id === app.id);
            if (index >= 0) APPLICATIONS[index] = app;
            else APPLICATIONS.push(app);
            return;
        } catch (e) { 
            console.error("API Save Failed, checking if offline mode possible...", e);
            throw e; 
        }
    }
    await simulateLatency(800);
    if (!ACTIVE_PROJECT_ID) throw new Error("No active project");
    const appWithProject = { ...app, projectId: ACTIVE_PROJECT_ID };
    const index = APPLICATIONS.findIndex(a => a.id === app.id);
    if (index >= 0) APPLICATIONS[index] = appWithProject;
    else APPLICATIONS.push(appWithProject);
  },
  
  bulkImportApplications: async (newApps: ApplicationData[]): Promise<number> => {
    if (USE_PRODUCTION_API) {
       // In a real scenario, this would POST to a bulk import endpoint
       // For now, we update local state assuming syncing happens later
    }
    
    let count = 0;
    newApps.forEach(app => {
        // Only add if ID doesn't exist
        if (!APPLICATIONS.find(a => a.id === app.id)) {
            APPLICATIONS.push(app);
            count++;
        }
    });
    return count;
  },

  // NEW METHOD: Redo Validation Logic
  resetApplicationStatus: async (appId: string, adminUser: string): Promise<void> => {
      const app = APPLICATIONS.find(a => a.id === appId);
      if(app) {
          app.status = AppStatus.PENDING;
          app.rejectionReason = undefined;
          app.validatorId = undefined;
          app.validationTimestamp = undefined;
          app.validationRemarks = undefined;
          
          app.auditLog.push({
              timestamp: new Date().toISOString(),
              userId: adminUser,
              action: 'ADMIN_RESET',
              details: 'Reset status to PENDING for re-validation'
          });

          if(USE_PRODUCTION_API) {
              await ApiService.saveApplication(app);
          }
      }
  },

  // NEW METHOD: Specific Duplicate Resolution (Append Note + Archive)
  resolveDuplicateWithNote: async (approvedId: string, rejectedApp: ApplicationData, adminUser: string): Promise<void> => {
      const approvedApp = APPLICATIONS.find(a => a.id === approvedId);
      const rejectedIndex = APPLICATIONS.findIndex(a => a.id === rejectedApp.id);

      if (approvedApp && rejectedIndex !== -1) {
          const reason = rejectedApp.rejectionReason || 'Duplicate';
          
          // 1. Update Approved App with Special Note
          const newNote = `\n[System] Application ${rejectedApp.id} is marked for rejected due to duplication (${reason}).`;
          approvedApp.notes = (approvedApp.notes || '') + newNote;
          approvedApp.auditLog.push({
              timestamp: new Date().toISOString(),
              userId: adminUser,
              action: 'DUPLICATE_NOTE_APPENDED',
              details: `Appended note regarding rejected duplicate ${rejectedApp.id}`
          });

          // 2. Archive Rejected App to clear from queue
          APPLICATIONS[rejectedIndex].lifecycleStage = 'ARCHIVED';
          APPLICATIONS[rejectedIndex].auditLog.push({
              timestamp: new Date().toISOString(),
              userId: adminUser,
              action: 'ARCHIVED_DUPLICATE',
              details: `Resolved as duplicate of ${approvedId}`
          });

          // 3. Save Both
          if(USE_PRODUCTION_API) {
              await ApiService.saveApplication(approvedApp);
              await ApiService.saveApplication(APPLICATIONS[rejectedIndex]);
          }
      }
  },

  // --- Document Upload ---
  uploadDocumentVersion: async (appId: string, docType: string, file: File, username: string): Promise<ApplicationData> => {
      if (USE_PRODUCTION_API) {
          try {
              const res = await ApiService.uploadDocument(appId, docType, file);
              const appIndex = APPLICATIONS.findIndex(a => a.id === appId);
              if (appIndex !== -1) {
                  const app = APPLICATIONS[appIndex];
                  const docIndex = app.documents.findIndex(d => d.type === docType);
                  
                  const newVersion: DocumentVersion = {
                      version: res.version,
                      url: res.url,
                      uploadedAt: res.uploadedAt || new Date().toISOString(),
                      uploadedBy: username,
                      fileName: res.fileName
                  };

                  let newDocs = [...app.documents];
                  if (docIndex >= 0) {
                      const currentDoc = newDocs[docIndex];
                      newDocs[docIndex] = { ...currentDoc, isAvailable: true, versions: [...currentDoc.versions, newVersion] };
                  } else {
                      newDocs.push({ type: docType, isAvailable: true, versions: [newVersion] });
                  }
                  
                  APPLICATIONS[appIndex] = { ...app, documents: newDocs };
                  return APPLICATIONS[appIndex];
              }
          } catch(e) { console.error(e); throw e; }
      }
      
      // Mock Logic
      await simulateLatency(1500); 
      const appIndex = APPLICATIONS.findIndex(a => a.id === appId);
      if (appIndex === -1) throw new Error("Application not found");
      
      const app = APPLICATIONS[appIndex];
      const docIndex = app.documents.findIndex(d => d.type === docType);
      const newVersion: DocumentVersion = {
          version: Date.now(),
          url: URL.createObjectURL(file), // Mock URL
          uploadedAt: new Date().toISOString(),
          uploadedBy: username,
          fileName: file.name
      };

      let newDocs = [...app.documents];
      if (docIndex >= 0) {
          const currentDoc = newDocs[docIndex];
          newDocs[docIndex] = { ...currentDoc, isAvailable: true, versions: [...currentDoc.versions, newVersion] };
      } else {
          newDocs.push({ type: docType, isAvailable: true, versions: [newVersion] });
      }
      APPLICATIONS[appIndex] = { ...app, documents: newDocs };
      return APPLICATIONS[appIndex];
  },

  promoteToProduction: async (appId: string, adminUser: string): Promise<void> => { 
      const app = APPLICATIONS.find(a => a.id === appId);
      if(app) {
          app.lifecycleStage = 'PRODUCTION';
          if(USE_PRODUCTION_API) await ApiService.saveApplication(app);
      }
  },
  
  mergeApplications: async (id1: string, id2: string, u: string): Promise<void> => { },
  linkApplications: async (id1: string, id2: string, u: string): Promise<void> => { },
  ignoreDuplicateWarning: async (id: string, u: string): Promise<void> => { },
  
  findDuplicates: (app: ApplicationData): DuplicateFinding[] => { 
      if (!app.id) return [];
      const findings: DuplicateFinding[] = [];
      const threshold = ADMIN_SETTINGS.duplicateThreshold;
      // SCAN ALL APPS GLOBALLY, NOT JUST ACTIVE PROJECT
      // This supports cross-project duplicate detection as requested.
      const allApps = APPLICATIONS; 
      
      allApps.forEach(existing => {
          if (existing.id === app.id) return; // Skip self
          
          // Exact Match on Aadhaar
          if (existing.aadhaar === app.aadhaar && app.aadhaar) {
              findings.push({ 
                  sourceId: existing.id, 
                  matchType: 'EXACT', 
                  field: 'Aadhaar', 
                  confidence: 1.0,
                  matchedStage: existing.lifecycleStage
              });
          }

          // Exact Match on Phone
          if (existing.phonePrimary === app.phonePrimary && app.phonePrimary) {
               findings.push({ 
                  sourceId: existing.id, 
                  matchType: 'EXACT', 
                  field: 'Phone', 
                  confidence: 1.0,
                  matchedStage: existing.lifecycleStage
              });
          }
      });
      return findings;
  },

  getStats: (): DashboardStats => { 
      const apps = DataService.getApplications();
      // Basic mock stat calculation
      const eligible = apps.filter(a => a.status === AppStatus.ELIGIBLE).length;
      const notEligible = apps.filter(a => a.status === AppStatus.NOT_ELIGIBLE).length;
      const pending = apps.filter(a => a.status === AppStatus.PENDING).length;
      
      return { 
          total: apps.length, 
          eligible, notEligible, pending, 
          lotteryReady: eligible, 
          byCategory: {}, byGender: {}, bySpecialCategory: {ph:0, nonPh:0} 
      }; 
  },

  processPrintTemplate: (app: ApplicationData): string => { 
      // Ensure we use the template from settings, falling back to default if empty
      let template = ADMIN_SETTINGS.consentFormTemplate || DEFAULT_CONSENT_TEMPLATE;
      
      // Get Project Name if possible
      // Fallback: Use ACTIVE_PROJECT_ID if app doesn't have it yet (e.g. before first save)
      const pid = app.projectId || ACTIVE_PROJECT_ID;
      const project = PROJECTS.find(p => p.id === pid);
      const projectName = project ? project.name : (pid || '-');
      
      const branding = BRANDING_CONFIG;

      // Variable Replacements
      const replacements: Record<string, string> = {
          '{{APP_ID}}': app.id || '-',
          '{{RECEIPT_DATE}}': app.physicalReceiptTimestamp ? new Date(app.physicalReceiptTimestamp).toLocaleString() : '-',
          '{{PROJECT_NAME}}': projectName,
          '{{APPLICANT_NAME}}': app.applicantName || '-',
          '{{FATHER_SPOUSE}}': app.fatherOrSpouseName || '-',
          '{{CATEGORY}}': app.category || '-',
          '{{AADHAAR}}': app.aadhaar || '-',
          '{{PHONE_PRIMARY}}': app.phonePrimary || '-',
          '{{PHONE_ALT}}': app.phoneAlt || '-',
          '{{ADDRESS}}': [app.addressLine1, app.addressLine2, app.city, app.pincode].filter(Boolean).join(', ') || '-',
          '{{CURRENT_DATE}}': new Date().toLocaleString(),
          '{{LOGO_URL}}': branding.logoUrl || '',
          '{{LOGO_DISPLAY}}': branding.logoUrl ? 'block' : 'none',
      };

      // Perform Global Replacement
      Object.keys(replacements).forEach(key => {
          template = template.replace(new RegExp(key, 'g'), replacements[key]);
      });

      return template;
  }
};
