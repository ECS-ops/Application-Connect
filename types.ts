
export enum UserRole {
  ADMIN = 'ADMIN',
  DEO = 'DEO',
  VALIDATOR = 'VALIDATOR',
  VIEWER = 'VIEWER'
}

export interface User {
  username: string;
  password: string; // In production, this should be hashed
  fullName: string;
  role: UserRole;
  isActive: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

export enum AppStatus {
  PENDING = 'PENDING',
  ELIGIBLE = 'ELIGIBLE',
  NOT_ELIGIBLE = 'NOT_ELIGIBLE',
  LOTTERY_READY = 'LOTTERY_READY',
  AWARDED = 'AWARDED',
  MERGED = 'MERGED' // New status for records merged into others
}

export type LifecycleStage = 'STAGING' | 'PRODUCTION' | 'ARCHIVED';

export enum LotteryStatus {
  PENDING = 'Pending',
  SHORTLISTED = 'Shortlisted',
  AWARDED = 'Awarded',
  NOT_AWARDED = 'Not Awarded'
}

// Default constants, but the field is now a string to support dynamic additions
export const DefaultRejectionReasons = {
  ALREADY_AWARDED: 'Already awarded in same scheme',
  INCOME_EXCEEDS: 'Income exceeds guidelines',
  FAKE_DOCUMENTS: 'Fake or forged documents',
  INCOMPLETE_DATA: 'Incomplete data/documents',
  OTHER: 'Other'
};

export interface DocumentVersion {
  version: number;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
  fileName: string;
}

export interface DocumentMeta {
  type: string;
  isAvailable: boolean;
  versions: DocumentVersion[];
}

export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  aadhaar: string;
  age: number;
}

export interface AuditLogEntry {
  timestamp: string;
  userId: string;
  action: string;
  details?: string;
}

export interface DriveConfig {
  clientId: string;
  clientSecret: string;
  rootFolderId: string;
  isConnected: boolean;
}

export interface BrandingConfig {
  logoUrl: string;
  loginHeader: string;
  loginSubtitle: string;
  loginFooter: string;
  loginBackgroundUrl: string;
  sidebarTitle: string;
  sidebarVersion: string;
  primaryColor: string;
}

export interface AdminSettings {
  documentChecklist: string[];
  rejectionReasons: string[];
  timezone: string;
  scannerDeviceName: string;
  retentionPeriodDays: number;
  duplicateThreshold: number; // 0.0 to 1.0
  consentFormTemplate: string; // HTML string with {{placeholders}}
}

export interface ApplicationData {
  // Core Identifiers
  id: string; // AppNumber (Unique)
  projectId: string; // Associated Project ID
  lifecycleStage: LifecycleStage; // STAGING or PRODUCTION
  entryTimestamp: string;
  physicalReceiptTimestamp: string;
  operatorId: string;
  
  // Personal Details
  applicantName: string;
  fatherOrSpouseName: string; 
  dob: string; 
  gender: 'Male' | 'Female' | 'Transgender';
  category: 'General' | 'OBC' | 'SC' | 'ST';
  isSpecialCategory: boolean; // PH Status
  
  // Contact & IDs
  phonePrimary: string;
  phoneAlt: string; 
  aadhaar: string;
  pan: string;
  
  // Financial
  bankAccount: string;
  ifsc: string;
  income: number;
  
  // Detailed Address
  addressLine1: string; 
  addressLine2: string; 
  city: string; 
  state: string; 
  pincode: string; 
  
  // Relations
  familyMembers: FamilyMember[];
  
  // Documents & Metadata
  documents: DocumentMeta[];
  consolidatedScanUrl?: string;
  
  // Status & Logic
  status: AppStatus;
  rejectionReason?: string; // Changed from Enum to string for flexibility
  validatorId?: string;
  validationTimestamp?: string;
  validationRemarks?: string;
  
  lotteryStatus: LotteryStatus; 
  duplicateFlags?: string; // JSON string of findings
  linkedAppIds?: string[]; // IDs of related/linked applications
  mergedIntoId?: string; // If merged, which ID is the primary
  notes?: string;

  // History
  auditLog: AuditLogEntry[];
}

export interface DuplicateFinding {
  sourceId: string;
  matchType: 'EXACT' | 'FUZZY';
  field: string;
  confidence: number; // 0 to 1
  matchedStage: LifecycleStage; // Track where the duplicate came from
}

export interface DashboardStats {
  total: number;
  eligible: number;
  notEligible: number;
  pending: number;
  lotteryReady: number;
  byCategory: Record<string, number>;
  byGender: Record<string, number>;
  bySpecialCategory: { ph: number; nonPh: number };
}
