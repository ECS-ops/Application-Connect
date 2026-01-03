
import React, { useState, useEffect } from 'react';
import { DataService } from '../services/dataService';
import { Download, FileText, UserPlus, Trash2, Shield, Printer, Eye, CloudCog, Save, Palette, Image as ImageIcon, Sliders, Plus, X, GitMerge, ArrowRight, Link as LinkIcon, AlertTriangle, CheckCircle, Database, History, FileCheck, Search, Edit2, ShieldAlert, Lock, Unlock, ExternalLink, AlertCircle, FileClock, FolderRoot, RotateCcw, Pencil, XCircle, MessageSquarePlus, Upload, FileSpreadsheet, StickyNote, Clock } from 'lucide-react';
import { User, UserRole, DuplicateFinding, ApplicationData, DriveConfig, BrandingConfig, AdminSettings, LifecycleStage, Project, AppStatus, LotteryStatus } from '../types';

interface AdminPanelProps {
  onBrandingUpdate?: (config: BrandingConfig) => void;
}

const PRESET_PALETTES = [
    { name: 'Official Sky', color: '#0ea5e9' },
    { name: 'Clean Teal', color: '#14b8a6' },
    { name: 'Trust Blue', color: '#2563eb' },
    { name: 'Royal Indigo', color: '#4f46e5' },
    { name: 'Corporate Slate', color: '#475569' },
    { name: 'Growth Emerald', color: '#059669' },
    { name: 'Modern Violet', color: '#7c3aed' },
    { name: 'Energy Rose', color: '#e11d48' },
    { name: 'Warm Orange', color: '#ea580c' },
    { name: 'Neutral Zinc', color: '#52525b' },
];

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBrandingUpdate }) => {
  const [activeTab, setActiveTab] = useState<'projects' | 'reports' | 'lifecycle' | 'users' | 'security' | 'drive' | 'branding' | 'config' | 'audit'>('projects');
  
  // Data States
  const [allData, setAllData] = useState<ApplicationData[]>(DataService.getApplications());
  
  const [projects, setProjects] = useState<Project[]>(DataService.getProjects());
  const [users, setUsers] = useState<User[]>(DataService.getUsers());
  const [driveConfig, setDriveConfig] = useState<DriveConfig>(DataService.getDriveConfig());
  const [brandingConfig, setBrandingConfig] = useState<BrandingConfig>(DataService.getBrandingConfig());
  const [adminSettings, setAdminSettings] = useState<AdminSettings>(DataService.getAdminSettings());
  
  // Project Form State
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectForm, setProjectForm] = useState({ name: '', description: '', isActive: true });

  // Security State
  const [bannedIps, setBannedIps] = useState<any[]>([]);
  const [manualIpUnlock, setManualIpUnlock] = useState('');

  // User Management State
  const [userFormState, setUserFormState] = useState({ username: '', password: '', fullName: '', role: UserRole.DEO, isActive: true });
  const [isEditingUser, setIsEditingUser] = useState(false);

  // Lifecycle & Dupe States
  const stagingApps = allData.filter(a => a.lifecycleStage === 'STAGING' && (a.status === 'PENDING' || a.status === 'NOT_ELIGIBLE'));
  const [resolvingApp, setResolvingApp] = useState<ApplicationData | null>(null);
  const [comparisonApp, setComparisonApp] = useState<ApplicationData | null>(null);

  // App Detail Viewer State
  const [viewingApp, setViewingApp] = useState<ApplicationData | null>(null);

  // Search State for Reports
  const [reportSearch, setReportSearch] = useState('');
  
  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  // Helper for List Management (Checklist/Reasons)
  const [newItemText, setNewItemText] = useState('');

  // Refresh Data Helper
  const refreshData = () => {
      setAllData(DataService.getApplications());
      setProjects(DataService.getProjects());
  };

  // Load Security Data when tab changes
  useEffect(() => {
    if (activeTab === 'security') {
        DataService.getBannedIps().then(ips => setBannedIps(ips));
    }
    // Always refresh data when entering Admin Panel
    refreshData();
  }, [activeTab]);

  const handleSaveProject = () => {
      if (!projectForm.name) return;

      if (editingProject) {
          // Update existing
          DataService.updateProject(editingProject.id, {
              name: projectForm.name,
              description: projectForm.description,
              isActive: projectForm.isActive
          });
          alert(`Project "${projectForm.name}" updated successfully.`);
      } else {
          // Create new
          const proj: Project = {
              id: `PROJ-${Date.now()}`,
              name: projectForm.name,
              description: projectForm.description,
              isActive: true,
              createdAt: new Date().toISOString()
          };
          DataService.addProject(proj);
          alert(`Project "${proj.name}" created successfully.`);
      }
      
      refreshData();
      resetProjectForm();
  };

  const startEditProject = (proj: Project) => {
      setEditingProject(proj);
      setProjectForm({ 
          name: proj.name, 
          description: proj.description, 
          isActive: proj.isActive 
      });
  };

  const resetProjectForm = () => {
      setEditingProject(null);
      setProjectForm({ name: '', description: '', isActive: true });
  };

  const handleUnlockIp = async (ip: string) => {
      try {
          await DataService.unlockIp(ip);
          alert(`IP ${ip} unlocked.`);
          // Refresh list
          const updated = await DataService.getBannedIps();
          setBannedIps(updated);
          setManualIpUnlock('');
      } catch (e: any) {
          alert("Error unlocking IP: " + e.message);
      }
  };

  const filteredReportData = allData.filter(app => {
      const term = reportSearch.toLowerCase();
      return (
          app.id.toLowerCase().includes(term) ||
          app.applicantName.toLowerCase().includes(term) ||
          app.aadhaar.includes(term) ||
          app.phonePrimary.includes(term)
      );
  });

  const getAllAuditLogs = () => {
    return allData.flatMap(app => 
        (app.auditLog || []).map(log => ({
            ...log,
            appId: app.id,
            applicantName: app.applicantName
        }))
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const downloadSystemAuditLog = () => {
    const logs = getAllAuditLogs();
    const headers = ["Timestamp", "App ID", "Applicant", "User ID", "Action", "Details"];
    const rows = logs.map(l => [
        l.timestamp,
        l.appId,
        `"${l.applicantName}"`,
        l.userId,
        l.action,
        `"${l.details?.replace(/"/g, '""') || ''}"`
    ].join(","));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `system_audit_log_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadCSV = (stage?: LifecycleStage) => {
      const dataToExport = stage ? allData.filter(a => a.lifecycleStage === stage) : allData;
      
      const headers = [
        "AppID", "Stage", "ApplicantName", "FatherSpouse", "DOB", "Gender", "Category", "IsPH",
        "Aadhaar", "Phone", "AltPhone", "PAN", "BankAccount", "IFSC", "Income",
        "Address1", "Address2", "City", "State", "Pincode",
        "FamilyMembersCount", "DocumentsAvailable",
        "Status", "RejectReason", "EntryTimestamp", "ReceiptTimestamp", "OperatorID", "ValidationTimestamp", "ValidatorID",
        "DuplicateWarnings", "AuditLog"
      ];
      const rows = dataToExport.map(a => {
          let dupInfo = "None";
          if(a.duplicateFlags) {
              try {
                  const flags = JSON.parse(a.duplicateFlags) as DuplicateFinding[];
                  dupInfo = flags.map(f => `${f.field} matches ${f.sourceId} (${f.matchType})`).join(" | ");
              } catch (e) { dupInfo = "Error Parsing Flags"; }
          }
          let auditString = (a.auditLog || []).map(log => `[${log.timestamp}] ${log.userId}: ${log.action}`).join("; ");
          
          // Map internal Lifecycle stage to Display Name
          const stageDisplay = a.lifecycleStage === 'PRODUCTION' ? 'Validated Data' : 'Decision Pending';

          return [
              a.id, stageDisplay, `"${a.applicantName}"`, `"${a.fatherOrSpouseName}"`, a.dob, a.gender, a.category, a.isSpecialCategory ? 'YES' : 'NO',
              `'${a.aadhaar}`, `'${a.phonePrimary}`, `'${a.phoneAlt}`, a.pan, `'${a.bankAccount}`, a.ifsc, a.income,
              `"${a.addressLine1}"`, `"${a.addressLine2}"`, a.city, a.state, a.pincode,
              a.familyMembers?.length || 0, `"${a.documents?.filter(d => d.isAvailable).map(d => d.type).join(', ')}"`,
              a.status, `"${a.rejectionReason || ''}"`, a.entryTimestamp, a.physicalReceiptTimestamp, a.operatorId, a.validationTimestamp || '', a.validatorId || '',
              `"${dupInfo}"`, `"${auditString}"`
          ].join(",");
      });
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `application_${stage ? (stage === 'PRODUCTION' ? 'validated' : 'pending') : 'full'}_export_${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };
  
  const downloadImportTemplate = () => {
    const headers = [
        "Application ID", "Project ID", "Lifecycle Stage (PRODUCTION/STAGING)", "Status (PENDING/ELIGIBLE/NOT_ELIGIBLE)", 
        "Applicant Name", "Father/Spouse Name", "DOB (YYYY-MM-DD)", "Gender", "Category", 
        "Special Category (Yes/No)", "Aadhaar Number", "PAN Card", "Primary Mobile", "Alternate Mobile",
        "Annual Income", "Bank Account No", "IFSC Code",
        "Address Line 1", "Address Line 2", "City", "State", "Pincode", 
        "Receipt Date (YYYY-MM-DD or ISO)", "Additional Notes"
    ];
    const example = [
        "LEGACY-001", "PROJ-001", "PRODUCTION", "ELIGIBLE", 
        "Rajesh Kumar", "Suresh Kumar", "1985-05-20", "Male", "General", 
        "No", "452189012345", "ABCDE1234F", "9898989898", "9999999999",
        "250000", "1234567890", "SBIN0001234",
        "Flat 101, Galaxy Apts", "MG Road", "Mumbai", "Maharashtra", "400001",
        "2023-12-01", "Imported from legacy system"
    ];
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), example.join(",")].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `application_data_migration_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleImportFileUpload = async () => {
      if (!importFile) return;
      setImporting(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
          const text = e.target?.result as string;
          if (!text) { setImporting(false); return; }
          try {
              // Custom CSV Parser to handle commas in quotes
              const parseCSV = (text: string) => {
                    const rows = [];
                    let currentRow = [];
                    let currentVal = '';
                    let insideQuote = false;
                    for (let i = 0; i < text.length; i++) {
                        const char = text[i];
                        if (char === '"') { insideQuote = !insideQuote; } 
                        else if (char === ',' && !insideQuote) { currentRow.push(currentVal.trim()); currentVal = ''; } 
                        else if (char === '\n' && !insideQuote) { currentRow.push(currentVal.trim()); if (currentRow.length > 1) rows.push(currentRow); currentRow = []; currentVal = ''; } 
                        else { currentVal += char; }
                    }
                    if (currentVal) currentRow.push(currentVal.trim());
                    if (currentRow.length > 1) rows.push(currentRow);
                    return rows;
              };
              const rows = parseCSV(text);
              const dataRows = rows.slice(1);
              const activeProject = DataService.getActiveProject();
              const defaultProjId = activeProject ? activeProject.id : 'PROJ-001';
              
              const newApps: ApplicationData[] = dataRows.map((row, idx) => {
                   const [appIdRaw, projIdRaw, stageRaw, statusRaw, name, father, dob, gender, cat, isPh, aadhaar, pan, phone, phoneAlt, income, bank, ifsc, addr1, addr2, city, state, pin, receiptDate, notes] = row;
                   const appId = appIdRaw || `IMP-${Date.now()}-${idx}`;
                   return {
                       id: appId, projectId: projIdRaw || defaultProjId, lifecycleStage: (stageRaw === 'PRODUCTION' ? 'PRODUCTION' : 'STAGING') as LifecycleStage,
                       entryTimestamp: new Date().toISOString(), physicalReceiptTimestamp: receiptDate ? new Date(receiptDate).toISOString() : new Date().toISOString(),
                       operatorId: 'admin_import', applicantName: name || '', fatherOrSpouseName: father || '', dob: dob || '1980-01-01', gender: (gender as any) || 'Male', category: (cat as any) || 'General', isSpecialCategory: isPh?.toLowerCase() === 'yes',
                       aadhaar: aadhaar || '', pan: pan || '', phonePrimary: phone || '', phoneAlt: phoneAlt || '', income: parseInt(income) || 0, bankAccount: bank || '', ifsc: ifsc || '',
                       addressLine1: addr1 || '', addressLine2: addr2 || '', city: city || '', state: state || 'Maharashtra', pincode: pin || '', status: (statusRaw === 'ELIGIBLE' || statusRaw === 'NOT_ELIGIBLE' ? statusRaw : 'PENDING') as AppStatus,
                       rejectionReason: statusRaw === 'NOT_ELIGIBLE' ? 'Imported as Rejected' : undefined, notes: notes || 'Imported via CSV', documents: DataService.getAdminSettings().documentChecklist.map(t => ({ type: t, isAvailable: false, versions: [] })), familyMembers: [], auditLog: [{ timestamp: new Date().toISOString(), userId: 'admin', action: 'BULK_IMPORT', details: 'Migrated from CSV' }], lotteryStatus: LotteryStatus.PENDING
                   };
              });
              const count = await DataService.bulkImportApplications(newApps);
              alert(`Successfully imported ${count} applications!`);
              setImportFile(null);
              refreshData(); // Refresh list after import
          } catch (error) { alert("Error parsing CSV. Please ensure format matches template."); } 
          finally { setImporting(false); }
      };
      reader.readAsText(importFile);
  };

  const generateSystemPDFReport = () => {
    const stats = DataService.getStats();
    const productionApps = allData.filter(a => a.lifecycleStage === 'PRODUCTION');
    const htmlContent = `<html><head><title>System Report</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left}</style></head><body><h1>System Status Report</h1><p>Active Apps: ${stats.total}</p><table><thead><tr><th>ID</th><th>Name</th><th>Status</th></tr></thead><tbody>${productionApps.slice(0,50).map(a=>`<tr><td>${a.id}</td><td>${a.applicantName}</td><td>${a.status}</td></tr>`).join('')}</tbody></table></body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(htmlContent); win.document.close(); setTimeout(() => win.print(), 500); }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    try {
        if (isEditingUser) { DataService.updateUser(userFormState.username, { fullName: userFormState.fullName, role: userFormState.role, isActive: userFormState.isActive, ...(userFormState.password ? { password: userFormState.password } : {}) }); } 
        else { DataService.addUser({ ...userFormState, isActive: true }); }
        setUsers(DataService.getUsers());
        resetUserForm();
    } catch (err: any) { alert(err.message); }
  };

  const resetUserForm = () => {
      setUserFormState({ username: '', password: '', fullName: '', role: UserRole.DEO, isActive: true });
      setIsEditingUser(false);
  };

  const startEditUser = (user: User) => {
      setUserFormState({ username: user.username, password: '', fullName: user.fullName, role: user.role, isActive: user.isActive });
      setIsEditingUser(true);
  };

  const handleDeleteUser = (username: string) => {
    if(username === 'admin') { alert("Cannot delete default admin."); return; }
    if(confirm(`Delete user ${username}?`)) { DataService.deleteUser(username); setUsers(DataService.getUsers()); }
  };

  const saveDriveConfig = (e: React.FormEvent) => {
      e.preventDefault();
      const isConfigured = !!(driveConfig.clientId && driveConfig.clientSecret && driveConfig.rootFolderId);
      const updatedConfig = { ...driveConfig, isConnected: isConfigured };
      setDriveConfig(updatedConfig); DataService.updateDriveConfig(updatedConfig);
      alert(isConfigured ? "Drive Configuration Saved & Connected!" : "Configuration Saved (Incomplete Credentials)");
  };

  const saveBrandingConfig = (e: React.FormEvent) => {
      e.preventDefault();
      DataService.updateBrandingConfig(brandingConfig);
      if(onBrandingUpdate) onBrandingUpdate(brandingConfig);
      alert("Branding Configuration Saved!");
  };

  const updateBrandingPreview = (newConfig: BrandingConfig) => {
      setBrandingConfig(newConfig);
      if(onBrandingUpdate) onBrandingUpdate(newConfig);
  };

  const saveAdminSettings = (e: React.FormEvent) => {
      e.preventDefault();
      DataService.updateAdminSettings(adminSettings);
      alert("System Configuration Updated!");
  };

  const addItemToList = (listKey: 'documentChecklist' | 'rejectionReasons') => {
      if(!newItemText.trim()) return;
      setAdminSettings(prev => ({ ...prev, [listKey]: [...prev[listKey], newItemText.trim()] }));
      setNewItemText('');
  };

  const removeItemFromList = (listKey: 'documentChecklist' | 'rejectionReasons', index: number) => {
      setAdminSettings(prev => ({ ...prev, [listKey]: prev[listKey].filter((_, i) => i !== index) }));
  };

  const promoteApp = async (id: string) => {
    if(confirm(`Promote ${id} to Validated Data?`)) {
        await DataService.promoteToProduction(id, 'admin');
        refreshData();
    }
  };

  const handleResolveDuplicate = (app: ApplicationData) => {
    setResolvingApp(app);
    const findings = DataService.findDuplicates(app);
    if(findings.length > 0) {
        const match = DataService.getApplicationById(findings[0].sourceId);
        if(match) setComparisonApp(match);
    } else {
        setComparisonApp(null);
    }
  };

  const executeResolution = async (action: 'MERGE' | 'LINK' | 'IGNORE' | 'APPEND_NOTE') => {
    if(!resolvingApp || !comparisonApp) return;
    if(action === 'MERGE') { if(confirm(`This will archive ${resolvingApp.id}...`)) await DataService.mergeApplications(comparisonApp.id, resolvingApp.id, 'admin'); } 
    else if (action === 'LINK') { await DataService.linkApplications(comparisonApp.id, resolvingApp.id, 'admin'); } 
    else if (action === 'IGNORE') { await DataService.ignoreDuplicateWarning(resolvingApp.id, 'admin'); } 
    else if (action === 'APPEND_NOTE') { if(confirm(`Confirm rejection?`)) await DataService.resolveDuplicateWithNote(comparisonApp.id, resolvingApp, 'admin'); }
    
    setResolvingApp(null); setComparisonApp(null); refreshData();
  };

  const handleResetStatus = async () => {
      if(viewingApp) {
          if(confirm(`Reset status of ${viewingApp.id} to PENDING?\n\nThis will send it back to the Validation Queue and clear current rejection/approval details.`)) {
             await DataService.resetApplicationStatus(viewingApp.id, 'admin');
             setViewingApp(null); 
             refreshData(); // Force refresh of table data
             alert("Application has been reset and sent back to validation.");
          }
      }
  };

  const handleResetFromResolution = async () => {
      if(resolvingApp) {
          if(confirm(`Reset ${resolvingApp.id} to Pending?`)) {
              await DataService.resetApplicationStatus(resolvingApp.id, 'admin');
              setResolvingApp(null); setComparisonApp(null); refreshData();
          }
      }
  };
  
  const saveAppChanges = async () => {
      if(!viewingApp) return;
      await DataService.saveApplication(viewingApp);
      alert("Application changes saved!");
      setViewingApp(null);
      refreshData();
  };

  const isPaletteSelected = (color: string) => brandingConfig.primaryColor?.toLowerCase() === color.toLowerCase();
  const getLifecycleDisplay = (stage: LifecycleStage) => stage === 'PRODUCTION' ? 'Validated Data' : stage === 'STAGING' ? 'Decision Pending' : stage;
  const getStageColorClass = (stage: LifecycleStage) => stage === 'PRODUCTION' ? 'bg-blue-200 text-blue-800' : stage === 'STAGING' ? 'bg-orange-200 text-orange-800' : 'bg-gray-200 text-gray-800';
  const getStageBgClass = (stage: LifecycleStage) => stage === 'PRODUCTION' ? 'bg-blue-50/50' : stage === 'STAGING' ? 'bg-orange-50/50' : 'bg-gray-50/50';
  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || id;

  return (
    <div className="h-full flex flex-col">
        {/* Full Screen Application View Modal */}
        {viewingApp && (
            <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-6xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                    <div className="p-5 border-b flex justify-between items-center bg-slate-50 shrink-0">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Application Details</h2>
                            <p className="text-sm text-slate-500 font-mono">{viewingApp.id}</p>
                        </div>
                        <button onClick={() => setViewingApp(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="flex flex-col lg:flex-row gap-6">
                            
                            {/* LEFT COLUMN: Details + Notes + Actions */}
                            <div className="flex-1 space-y-6">
                                {/* Basic Details */}
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Applicant Profile</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div><label className="text-xs font-bold text-slate-500 uppercase">Applicant</label><p className="font-semibold">{viewingApp.applicantName}</p></div>
                                        <div><label className="text-xs font-bold text-slate-500 uppercase">Status</label><p><span className={`px-2 py-0.5 rounded text-xs font-bold ${viewingApp.status === 'ELIGIBLE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{viewingApp.status}</span></p></div>
                                        <div><label className="text-xs font-bold text-slate-500 uppercase">Aadhaar</label><p className="font-mono">{viewingApp.aadhaar}</p></div>
                                        <div><label className="text-xs font-bold text-slate-500 uppercase">Mobile</label><p className="font-mono">{viewingApp.phonePrimary}</p></div>
                                        <div><label className="text-xs font-bold text-slate-500 uppercase">Income</label><p>₹{viewingApp.income.toLocaleString('en-IN')}</p></div>
                                        <div><label className="text-xs font-bold text-slate-500 uppercase">Category</label><p>{viewingApp.category}</p></div>
                                        <div><label className="text-xs font-bold text-slate-500 uppercase">Special Category (PH)</label><p>{viewingApp.isSpecialCategory ? 'Yes' : 'No'}</p></div>
                                    </div>
                                </div>

                                {/* Editable Remarks Section (Preserved) */}
                                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100 shadow-sm">
                                    <h3 className="text-sm font-bold text-yellow-800 mb-2 flex items-center gap-2">
                                        <StickyNote size={16}/> Additional Remarks (Editable)
                                    </h3>
                                    <textarea 
                                        className="w-full bg-white border border-yellow-200 rounded p-2 text-sm text-slate-700 focus:ring-yellow-500 focus:border-yellow-500" 
                                        rows={3}
                                        value={viewingApp.notes || ''}
                                        onChange={(e) => setViewingApp({...viewingApp, notes: e.target.value})}
                                        placeholder="Add or edit administrative notes here..."
                                    ></textarea>
                                    <p className="text-xs text-yellow-600 mt-2 flex items-center gap-1">
                                        <AlertCircle size={12}/> Changes to notes will be saved to the record.
                                    </p>
                                </div>
                                
                                {/* Admin Actions */}
                                <div className="border-t pt-4">
                                    <h3 className="font-bold text-slate-700 mb-2">Administrative Actions</h3>
                                    <button onClick={handleResetStatus} className="w-full text-left p-3 border rounded bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-700 flex items-center transition-colors group">
                                        <div className="bg-slate-100 p-2 rounded-full mr-3 group-hover:bg-red-100"><RotateCcw size={16}/></div>
                                        <div>
                                            <div className="font-bold">Reset Status to Pending</div>
                                            <div className="text-xs text-slate-500 group-hover:text-red-500">Reverts decision and sends back to validation queue.</div>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Audit Log Box */}
                            <div className="w-full lg:w-96 shrink-0">
                                <div className="bg-slate-50 rounded-lg border border-slate-200 h-full max-h-[500px] flex flex-col shadow-sm">
                                    <div className="p-3 border-b border-slate-200 bg-slate-100 font-bold text-slate-700 flex items-center gap-2 shrink-0">
                                        <History size={16}/> Audit Trail
                                    </div>
                                    <div className="overflow-y-auto p-0 flex-1">
                                        {(viewingApp.auditLog || []).length === 0 ? (
                                            <div className="p-6 text-center text-slate-400 italic text-sm">No history recorded</div>
                                        ) : (
                                            <div className="divide-y divide-slate-100">
                                                {[...(viewingApp.auditLog || [])].reverse().map((log, i) => (
                                                    <div key={i} className="p-3 hover:bg-white transition-colors">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                                                                <Clock size={10}/> {new Date(log.timestamp).toLocaleString()}
                                                            </span>
                                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase ${
                                                                log.action.includes('REJECT') ? 'bg-red-50 border-red-100 text-red-600' :
                                                                log.action.includes('APPROVE') ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                                                                'bg-slate-100 border-slate-200 text-slate-600'
                                                            }`}>
                                                                {log.action}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs font-bold text-slate-700 mb-0.5">{log.userId}</p>
                                                        <p className="text-xs text-slate-500">{log.details}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* BOTTOM SECTION: Documents */}
                        <div className="mt-8 pt-6 border-t border-slate-200">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <FileCheck size={18}/> Submitted Documents
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {viewingApp.documents.map((doc, idx) => {
                                    const hasVersions = doc.versions && doc.versions.length > 0;
                                    const latestDocUrl = hasVersions ? doc.versions[doc.versions.length - 1].url : null;
                                    
                                    return (
                                        <div key={idx} className={`p-3 rounded-lg border flex items-start gap-3 relative group transition-all ${doc.isAvailable ? 'bg-white border-slate-200 hover:shadow-md' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                            <div className={`p-2 rounded-md ${doc.isAvailable ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                                                <FileText size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-700 truncate" title={doc.type}>{doc.type}</p>
                                                <div className="flex justify-between items-center mt-1">
                                                    <span className={`text-[10px] font-medium ${doc.isAvailable ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                        {doc.isAvailable ? 'Available' : 'Missing'}
                                                    </span>
                                                    {doc.versions.length > 0 && (
                                                        <span className="bg-blue-50 text-blue-600 text-[9px] px-1.5 py-0.5 rounded border border-blue-100">
                                                            v{doc.versions.length}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* External Link Overlay */}
                                            {latestDocUrl && (
                                                <a 
                                                    href={latestDocUrl} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="absolute inset-0 z-10"
                                                    title="Open Document in New Tab"
                                                >
                                                </a>
                                            )}
                                            {latestDocUrl && (
                                                <div className="absolute top-2 right-2 text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ExternalLink size={14} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
                        <button onClick={() => setViewingApp(null)} className="px-5 py-2.5 text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-colors font-medium">Cancel</button>
                        <button onClick={saveAppChanges} className="px-5 py-2.5 bg-brand-600 text-white hover:bg-brand-700 rounded-lg font-bold shadow-sm transition-colors flex items-center gap-2">
                            <Save size={18}/> Save Changes
                        </button>
                    </div>
                </div>
            </div>
        )}
    
        {/* Sticky Header Section */}
        <div className="p-6 shrink-0 border-b border-gray-200 bg-white shadow-sm z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Admin Administration</h1>
                <div className="flex space-x-2 bg-gray-200 p-1 rounded-lg flex-wrap gap-y-1">
                    <button onClick={() => setActiveTab('projects')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'projects' ? 'bg-white shadow text-brand-700' : 'text-gray-600'}`}><FolderRoot size={16}/> Projects</button>
                    <button onClick={() => setActiveTab('reports')} className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'reports' ? 'bg-white shadow text-brand-700' : 'text-gray-600'}`}>Reports & Data</button>
                    <button onClick={() => setActiveTab('lifecycle')} className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'lifecycle' ? 'bg-white shadow text-brand-700' : 'text-gray-600'}`}>Lifecycle</button>
                    <button onClick={() => setActiveTab('audit')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'audit' ? 'bg-white shadow text-brand-700' : 'text-gray-600'}`}><FileClock size={14}/> Audit</button>
                    <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'users' ? 'bg-white shadow text-brand-700' : 'text-gray-600'}`}>Users</button>
                    <button onClick={() => setActiveTab('security')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${activeTab === 'security' ? 'bg-white shadow text-brand-700' : 'text-gray-600'}`}><ShieldAlert size={14}/> Security</button>
                    <button onClick={() => setActiveTab('config')} className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'config' ? 'bg-white shadow text-brand-700' : 'text-gray-600'}`}>Config</button>
                    <button onClick={() => setActiveTab('branding')} className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'branding' ? 'bg-white shadow text-brand-700' : 'text-gray-600'}`}>Branding</button>
                </div>
            </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
            
            {/* --- PROJECTS TAB --- */}
            {activeTab === 'projects' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[400px]">
                    {/* Create/Edit Project Section */}
                    <div className={`bg-white p-6 rounded-2xl shadow-sm border h-fit transition-colors ${editingProject ? 'border-brand-300 ring-2 ring-brand-100' : 'border-slate-200'}`}>
                        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            {editingProject ? (
                                <><Edit2 className="text-brand-600" /> Edit Project</>
                            ) : (
                                <><Plus className="text-brand-600" /> Create New Project</>
                            )}
                        </h2>
                        
                        <div className="space-y-4">
                            {editingProject && (
                                <div className="bg-blue-50 border border-blue-100 text-blue-800 text-xs p-2 rounded mb-2 font-mono">
                                    ID: {editingProject.id}
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Project Name</label>
                                <input 
                                    className="w-full bg-slate-50 border-slate-200 rounded-lg p-2.5 text-sm focus:ring-brand-500 focus:border-brand-500" 
                                    placeholder="e.g. MHADA Housing 2024"
                                    value={projectForm.name}
                                    onChange={e => setProjectForm({...projectForm, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Description</label>
                                <textarea 
                                    className="w-full bg-slate-50 border-slate-200 rounded-lg p-2.5 text-sm focus:ring-brand-500 focus:border-brand-500" 
                                    placeholder="Purpose of this housing project..."
                                    rows={3}
                                    value={projectForm.description}
                                    onChange={e => setProjectForm({...projectForm, description: e.target.value})}
                                />
                            </div>
                            
                            {editingProject && (
                                <div className="flex items-center gap-3 py-2">
                                    <label className="text-sm font-medium text-slate-700">Status:</label>
                                    <button 
                                        onClick={() => setProjectForm({...projectForm, isActive: !projectForm.isActive})}
                                        className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${projectForm.isActive ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                                    >
                                        {projectForm.isActive ? 'Active' : 'Archived'}
                                    </button>
                                </div>
                            )}

                            <div className="flex gap-2 pt-2">
                                <button onClick={handleSaveProject} disabled={!projectForm.name} className="flex-1 bg-brand-600 text-white py-3 rounded-lg font-bold shadow-lg shadow-brand-500/30 hover:bg-brand-700 transition-all disabled:opacity-50">
                                    {editingProject ? 'Update Project' : 'Add Project'}
                                </button>
                                {editingProject && (
                                    <button onClick={resetProjectForm} className="bg-slate-100 text-slate-600 px-4 rounded-lg hover:bg-slate-200 transition-colors" title="Cancel Edit">
                                        <XCircle size={20} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* List Section */}
                    <div className="lg:col-span-2 space-y-4">
                        {projects.map(proj => (
                            <div key={proj.id} className={`bg-white p-6 rounded-2xl shadow-sm border flex items-center justify-between group transition-all ${editingProject?.id === proj.id ? 'border-brand-400 ring-1 ring-brand-100' : 'border-slate-200'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl ${proj.isActive ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-400'}`}>
                                        <FolderRoot size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">{proj.name}</h3>
                                        <p className="text-sm text-slate-500">{proj.description}</p>
                                        <div className="flex items-center gap-4 mt-1 text-[10px] font-bold uppercase tracking-wider">
                                            <span className="text-slate-400">ID: {proj.id}</span>
                                            <span className="text-slate-400">Created: {new Date(proj.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${proj.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                        {proj.isActive ? 'Active' : 'Archived'}
                                    </div>
                                    <button 
                                        onClick={() => startEditProject(proj)}
                                        className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                        title="Edit Project Details"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {projects.length === 0 && <p className="text-center text-slate-400 py-10">No projects configured.</p>}
                    </div>
                </div>
            )}

            {/* --- REPORTS TAB --- */}
            {activeTab === 'reports' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold mb-4 text-brand-700">Reporting Actions</h2>
                        <div className="flex flex-wrap gap-4">
                            <button onClick={() => downloadCSV('STAGING')} className="flex items-center bg-orange-50 text-orange-700 px-4 py-2 rounded border border-orange-200 hover:bg-orange-100">
                                <FileText size={18} className="mr-2"/> Export Decision Pending (Raw)
                            </button>
                            <button onClick={() => downloadCSV('PRODUCTION')} className="flex items-center bg-green-50 text-green-700 px-4 py-2 rounded border border-green-200 hover:bg-green-100">
                                <FileCheck size={18} className="mr-2"/> Export Validated Data (Clean)
                            </button>
                            <button onClick={() => downloadCSV()} className="flex items-center bg-gray-50 text-gray-700 px-4 py-2 rounded border border-gray-200 hover:bg-gray-100">
                                <Download size={18} className="mr-2"/> Export All
                            </button>
                            <button onClick={generateSystemPDFReport} className="flex items-center bg-red-50 text-red-700 px-4 py-2 rounded border border-red-200 hover:bg-red-100">
                                <Printer size={18} className="mr-2"/> System PDF Report
                            </button>
                        </div>
                    </div>
                    
                    {/* NEW: Data Migration & Import Section */}
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-500">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-indigo-100 p-2 rounded-full text-indigo-600"><Database size={20} /></div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">Data Migration & Import</h2>
                                <p className="text-sm text-gray-500">Import legacy data or previous project records for duplication checking.</p>
                            </div>
                        </div>
                        
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                             {/* Step 1: Download Template */}
                            <div className="flex-1 bg-gray-50 p-4 rounded border border-gray-200 w-full">
                                <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2"><FileSpreadsheet size={16}/> Step 1: Get Template</h4>
                                <p className="text-xs text-gray-500 mb-4">Download the CSV template with headers and example data to ensure correct formatting.</p>
                                <button onClick={downloadImportTemplate} className="text-sm bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 flex items-center">
                                    <Download size={14} className="mr-2"/> Download CSV Template
                                </button>
                            </div>

                            {/* Step 2: Upload */}
                            <div className="flex-1 bg-gray-50 p-4 rounded border border-gray-200 w-full">
                                <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2"><Upload size={16}/> Step 2: Upload Data</h4>
                                <p className="text-xs text-gray-500 mb-4">Select the filled CSV file. Data will be added to the global duplication check registry.</p>
                                <div className="flex gap-2">
                                    <input 
                                        type="file" 
                                        accept=".csv"
                                        onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)}
                                        className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                    />
                                    <button 
                                        onClick={handleImportFileUpload} 
                                        disabled={!importFile || importing}
                                        className={`text-sm px-4 py-2 rounded text-white font-medium flex items-center ${!importFile || importing ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                    >
                                        {importing ? 'Importing...' : 'Start Import'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-700">All Applications (Current Context)</h3>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    placeholder="Search by ID, Name, Aadhaar..." 
                                    className="pl-9 pr-4 py-2 border rounded-md text-sm w-64 focus:ring-brand-500 focus:border-brand-500"
                                    value={reportSearch}
                                    onChange={(e) => setReportSearch(e.target.value)}
                                />
                                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left">App ID</th><th className="px-6 py-3 text-left">Stage</th><th className="px-6 py-3 text-left">Applicant</th><th className="px-6 py-3 text-left">Status</th><th className="px-6 py-3 text-right">View</th></tr></thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredReportData.map(app => (
                                        <tr key={app.id}>
                                            <td className="px-6 py-4 font-bold text-brand-600">{app.id}</td>
                                            <td className="px-6 py-4 text-xs font-mono">{getLifecycleDisplay(app.lifecycleStage)}</td>
                                            <td className="px-6 py-4">{app.applicantName}</td>
                                            <td className="px-6 py-4"><span className={`px-2 rounded-full text-xs font-semibold ${app.status === 'ELIGIBLE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{app.status}</span></td>
                                            <td className="px-6 py-4 text-right"><button onClick={() => setViewingApp(app)} className="text-gray-500 hover:text-gray-900"><Eye size={18}/></button></td>
                                        </tr>
                                    ))}
                                    {filteredReportData.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No applications found matching "{reportSearch}" in current project.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* --- USERS TAB --- */}
            {activeTab === 'users' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[400px]">
                    <div className={`bg-white rounded-lg shadow p-6 ${isEditingUser ? 'border-2 border-brand-500' : ''}`}>
                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                            {isEditingUser ? <Edit2 className="mr-2 text-brand-600" size={20}/> : <UserPlus className="mr-2" size={20}/>} 
                            {isEditingUser ? 'Edit User' : 'Create New User'}
                        </h3>
                        <form onSubmit={handleSaveUser} className="space-y-4">
                            <div>
                                <label className="block text-sm">Full Name</label>
                                <input className="border w-full p-2 rounded" value={userFormState.fullName} onChange={e=>setUserFormState({...userFormState, fullName:e.target.value})} required/>
                            </div>
                            <div>
                                <label className="block text-sm">Username</label>
                                <input className={`border w-full p-2 rounded ${isEditingUser ? 'bg-gray-100' : ''}`} value={userFormState.username} onChange={e=>setUserFormState({...userFormState, username:e.target.value})} disabled={isEditingUser} required/>
                            </div>
                            <div>
                                <label className="block text-sm">Password {isEditingUser && <span className="text-gray-400 text-xs">(Leave blank to keep current)</span>}</label>
                                <input className="border w-full p-2 rounded" type="password" value={userFormState.password} onChange={e=>setUserFormState({...userFormState, password:e.target.value})} required={!isEditingUser}/>
                            </div>
                            <div>
                                <label className="block text-sm">Role</label>
                                <select className="border w-full p-2 rounded" value={userFormState.role} onChange={e=>setUserFormState({...userFormState, role:e.target.value as UserRole})}>
                                    <option value={UserRole.DEO}>Data Entry</option>
                                    <option value={UserRole.VALIDATOR}>Validator</option>
                                    <option value={UserRole.ADMIN}>Admin</option>
                                    <option value={UserRole.VIEWER}>Dashboard Viewer</option>
                                </select>
                            </div>
                            <div className="flex gap-2">
                                {isEditingUser && <button type="button" onClick={resetUserForm} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded">Cancel</button>}
                                <button type="submit" className="flex-1 bg-brand-600 text-white py-2 rounded">{isEditingUser ? 'Update User' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                    <div className="bg-white rounded-lg shadow overflow-hidden lg:col-span-2">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left">User</th><th className="px-6 py-3 text-left">Role</th><th className="px-6 py-3 text-center">Actions</th></tr></thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.username}>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{u.fullName}</div>
                                                <div className="text-xs text-gray-500">@{u.username}</div>
                                            </td>
                                            <td className="px-6 py-4"><span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded font-mono">{u.role}</span></td>
                                            <td className="px-6 py-4 flex justify-center gap-2">
                                                <button onClick={()=>startEditUser(u)} className="text-brand-600 hover:text-brand-800 p-1"><Edit2 size={16}/></button>
                                                <button onClick={()=>handleDeleteUser(u.username)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SYSTEM CONFIG TAB --- */}
            {activeTab === 'config' && (
                <div className="max-w-4xl mx-auto space-y-6 min-h-[400px]">
                    <div className="bg-white rounded-lg shadow p-6 border border-brand-100">
                        <div className="flex items-center gap-3 mb-6 border-b pb-4">
                            <div className="bg-teal-100 p-2 rounded-full text-teal-600"><Sliders size={32} /></div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">System Configuration</h2>
                                <p className="text-sm text-gray-500">Manage live settings for data capture, validation, and retention.</p>
                            </div>
                        </div>

                        <form onSubmit={saveAdminSettings} className="space-y-8">
                            {/* 1. General Settings */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Timezone (e.g., Asia/Kolkata)</label>
                                    <input type="text" className="mt-1 w-full border rounded p-2" 
                                        value={adminSettings?.timezone || ''} onChange={e => setAdminSettings({...adminSettings, timezone: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Scanner Device Name (TWAIN)</label>
                                    <input type="text" className="mt-1 w-full border rounded p-2" 
                                        value={adminSettings?.scannerDeviceName || ''} onChange={e => setAdminSettings({...adminSettings, scannerDeviceName: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Duplicate Check Threshold (0.1 - 1.0)</label>
                                    <input type="number" step="0.01" min="0" max="1" className="mt-1 w-full border rounded p-2" 
                                        value={adminSettings?.duplicateThreshold || 0.8} onChange={e => setAdminSettings({...adminSettings, duplicateThreshold: parseFloat(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Data Retention Period (Days)</label>
                                    <input type="number" className="mt-1 w-full border rounded p-2" 
                                        value={adminSettings?.retentionPeriodDays || 365} onChange={e => setAdminSettings({...adminSettings, retentionPeriodDays: parseInt(e.target.value)})} />
                                </div>
                            </div>

                            {/* 2. Lists Management */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Document Checklist */}
                                <div className="border rounded p-4 bg-gray-50">
                                    <h3 className="font-semibold text-gray-800 mb-2">Document Checklist</h3>
                                    <div className="space-y-2 mb-4 h-48 overflow-y-auto bg-white border p-2 rounded">
                                        {adminSettings?.documentChecklist?.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-sm p-1 hover:bg-gray-100">
                                                <span>{item}</span>
                                                <button type="button" onClick={() => removeItemFromList('documentChecklist', idx)} className="text-red-500"><X size={14}/></button>
                                            </div>
                                        )) || <div className="text-xs text-gray-400 p-2">No items found</div>}
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="Add Document Type" className="flex-1 border rounded p-1 text-sm"
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setNewItemText(e.currentTarget.value); addItemToList('documentChecklist'); e.currentTarget.value = ''; }}}
                                            onChange={(e) => setNewItemText(e.target.value)}
                                        />
                                        <button type="button" onClick={() => addItemToList('documentChecklist')} className="bg-brand-600 text-white p-1 rounded"><Plus size={18}/></button>
                                    </div>
                                </div>

                                {/* Rejection Reasons */}
                                <div className="border rounded p-4 bg-gray-50">
                                    <h3 className="font-semibold text-gray-800 mb-2">Ineligible Reasons</h3>
                                    <div className="space-y-2 mb-4 h-48 overflow-y-auto bg-white border p-2 rounded">
                                        {adminSettings?.rejectionReasons?.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-sm p-1 hover:bg-gray-100">
                                                <span>{item}</span>
                                                <button type="button" onClick={() => removeItemFromList('rejectionReasons', idx)} className="text-red-500"><X size={14}/></button>
                                            </div>
                                        )) || <div className="text-xs text-gray-400 p-2">No reasons found</div>}
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="Add Reason" className="flex-1 border rounded p-1 text-sm"
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setNewItemText(e.currentTarget.value); addItemToList('rejectionReasons'); e.currentTarget.value = ''; }}}
                                            onChange={(e) => setNewItemText(e.target.value)}
                                        />
                                        <button type="button" onClick={() => addItemToList('rejectionReasons')} className="bg-brand-600 text-white p-1 rounded"><Plus size={18}/></button>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Template Editor */}
                            <div className="border-t pt-6">
                                <h3 className="font-semibold text-gray-800 mb-2">Consent Form Print Template (HTML)</h3>
                                <p className="text-xs text-gray-500 mb-2">
                                    Available Placeholders: <code>{`{{APP_ID}}, {{APPLICANT_NAME}}, {{RECEIPT_DATE}}, {{CATEGORY}}, {{AADHAAR}}, {{PROJECT_NAME}}`}</code>
                                </p>
                                <textarea 
                                    className="w-full h-64 border rounded p-2 font-mono text-xs bg-gray-50"
                                    value={adminSettings?.consentFormTemplate || ''}
                                    onChange={(e) => setAdminSettings({...adminSettings, consentFormTemplate: e.target.value})}
                                />
                            </div>

                            <button type="submit" className="w-full bg-teal-600 text-white py-3 rounded-lg font-bold shadow hover:bg-teal-700 flex justify-center items-center">
                                <Save size={18} className="mr-2"/> Save Configuration
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* --- DRIVE TAB --- */}
            {activeTab === 'drive' && (
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="bg-white rounded-lg shadow-lg border border-blue-100 p-6">
                        <div className="flex items-center gap-3 mb-6 border-b pb-4">
                            <div className="bg-blue-100 p-2 rounded-full text-blue-600"><CloudCog size={32} /></div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Google Drive Integration</h2>
                                <p className="text-sm text-gray-500">Configure cloud storage for document backups and versioning.</p>
                            </div>
                        </div>
                        
                        <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6 text-sm text-blue-800 flex items-start">
                            <AlertCircle className="shrink-0 mr-2 mt-0.5" size={16} />
                            <div>
                                <p className="font-semibold mb-1">Integration Instructions:</p>
                                <ol className="list-decimal ml-4 space-y-1 text-blue-700">
                                    <li>Go to the <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="underline hover:text-blue-900">Google Cloud Console</a> and create a new project.</li>
                                    <li>Enable the <strong>Google Drive API</strong> in the library.</li>
                                    <li>Create <strong>OAuth 2.0 Client IDs</strong> or a Service Account.</li>
                                    <li>Enter the Client ID and Secret below.</li>
                                    <li>Share the target Root Folder with the Service Account email.</li>
                                </ol>
                            </div>
                        </div>

                        <form onSubmit={saveDriveConfig} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
                                    <input 
                                        type="text" 
                                        className="w-full border rounded p-2 font-mono text-sm"
                                        placeholder="xxxxxxxx.apps.googleusercontent.com"
                                        value={driveConfig.clientId}
                                        onChange={(e) => setDriveConfig({...driveConfig, clientId: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
                                    <input 
                                        type="password" 
                                        className="w-full border rounded p-2 font-mono text-sm"
                                        placeholder="xxxxxxxxxxxx"
                                        value={driveConfig.clientSecret}
                                        onChange={(e) => setDriveConfig({...driveConfig, clientSecret: e.target.value})}
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Root Folder ID</label>
                                <input 
                                    type="text" 
                                    className="w-full border rounded p-2 font-mono text-sm"
                                    placeholder="Folder ID from URL (e.g. 1a2b3c...)"
                                    value={driveConfig.rootFolderId}
                                    onChange={(e) => setDriveConfig({...driveConfig, rootFolderId: e.target.value})}
                                />
                                <p className="text-xs text-gray-400 mt-1">This is the folder where all project sub-folders will be created.</p>
                            </div>

                            <div className="flex items-center gap-3 pt-4">
                                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-md">
                                    Save & Connect
                                </button>
                                {driveConfig.isConnected && (
                                    <span className="flex items-center text-green-600 text-sm font-bold bg-green-50 px-3 py-1 rounded border border-green-200">
                                        <CheckCircle size={16} className="mr-1"/> Connected
                                    </span>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- BRANDING TAB --- */}
            {activeTab === 'branding' && (
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="bg-white rounded-lg shadow-lg border border-purple-100 p-6">
                         <div className="flex items-center gap-3 mb-6 border-b pb-4">
                            <div className="bg-purple-100 p-2 rounded-full text-purple-600"><Palette size={32} /></div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">White Label Branding</h2>
                                <p className="text-sm text-gray-500">Customize the look and feel for your organization.</p>
                            </div>
                        </div>

                        <form onSubmit={saveBrandingConfig} className="space-y-8">
                             {/* Color Palette */}
                             <div>
                                <h3 className="font-bold text-gray-700 mb-3">Primary Theme Color</h3>
                                <div className="flex flex-wrap gap-3 mb-4">
                                    {PRESET_PALETTES.map(p => (
                                        <button
                                            key={p.color}
                                            type="button"
                                            onClick={() => updateBrandingPreview({...brandingConfig, primaryColor: p.color})}
                                            className={`w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 ${isPaletteSelected(p.color) ? 'border-gray-800 ring-2 ring-gray-300' : 'border-transparent'}`}
                                            style={{backgroundColor: p.color}}
                                            title={p.name}
                                        />
                                    ))}
                                    <div className="relative">
                                        <input 
                                            type="color" 
                                            className="w-10 h-10 rounded-full overflow-hidden cursor-pointer"
                                            value={brandingConfig.primaryColor}
                                            onChange={(e) => updateBrandingPreview({...brandingConfig, primaryColor: e.target.value})}
                                            title="Custom Color"
                                        />
                                    </div>
                                </div>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            className="w-full border rounded p-2 text-sm"
                                            placeholder="https://example.com/logo.png"
                                            value={brandingConfig.logoUrl}
                                            onChange={(e) => updateBrandingPreview({...brandingConfig, logoUrl: e.target.value})}
                                        />
                                        <div className="w-10 h-10 bg-gray-100 border rounded flex items-center justify-center shrink-0">
                                            {brandingConfig.logoUrl ? <img src={brandingConfig.logoUrl} className="max-h-8 max-w-8 object-contain"/> : <ImageIcon size={16} className="text-gray-400"/>}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Login Background URL</label>
                                     <input 
                                        type="text" 
                                        className="w-full border rounded p-2 text-sm"
                                        placeholder="https://example.com/bg.jpg"
                                        value={brandingConfig.loginBackgroundUrl}
                                        onChange={(e) => updateBrandingPreview({...brandingConfig, loginBackgroundUrl: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sidebar Title</label>
                                    <input 
                                        type="text" 
                                        className="w-full border rounded p-2 text-sm"
                                        value={brandingConfig.sidebarTitle}
                                        onChange={(e) => updateBrandingPreview({...brandingConfig, sidebarTitle: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sidebar Version</label>
                                    <input 
                                        type="text" 
                                        className="w-full border rounded p-2 text-sm"
                                        value={brandingConfig.sidebarVersion}
                                        onChange={(e) => updateBrandingPreview({...brandingConfig, sidebarVersion: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Login Header Text</label>
                                    <input 
                                        type="text" 
                                        className="w-full border rounded p-2 text-sm"
                                        value={brandingConfig.loginHeader}
                                        onChange={(e) => updateBrandingPreview({...brandingConfig, loginHeader: e.target.value})}
                                    />
                                </div>
                             </div>
                             
                             <button type="submit" className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-purple-700 shadow-md flex items-center">
                                <Save size={18} className="mr-2"/> Save Branding
                             </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
