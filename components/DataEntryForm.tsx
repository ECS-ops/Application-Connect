
import React, { useState, useRef, useEffect } from 'react';
import { ApplicationData, AppStatus, DocumentMeta, FamilyMember, LotteryStatus, DuplicateFinding, AdminSettings } from '../types';
import { DataService } from '../services/dataService';
import { Scan, Save, Printer, Plus, Trash2, UploadCloud, Search, Wifi, WifiOff, Loader, CheckCircle, FileCheck, Keyboard, AlertTriangle, X, ExternalLink, ShieldAlert, MonitorCheck, User, MapPin, CreditCard, Users, FileText, Clock, Archive } from 'lucide-react';

interface DataEntryFormProps {
  onSuccess: () => void;
  currentUser: string;
}

// --- HELPER COMPONENTS MOVED OUTSIDE TO PREVENT RE-RENDERING/FOCUS LOSS ---

const SectionCard = ({ title, icon: Icon, children, className = "" }: any) => (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
        <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <div className="p-1.5 bg-white rounded-md shadow-sm border border-slate-100 text-brand-600">
                <Icon size={18} />
            </div>
            <h3 className="font-semibold text-slate-800">{title}</h3>
        </div>
        <div className="p-6">
            {children}
        </div>
    </div>
);

const InputField = ({ label, name, type = "text", required = false, ...props }: any) => (
    <div>
        <label className="block text-sm font-medium text-slate-600 mb-1.5">{label} {required && <span className="text-red-500">*</span>}</label>
        <input 
          type={type} 
          name={name} 
          required={required} 
          className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 py-2.5 text-slate-800 placeholder:text-slate-400"
          {...props} 
        />
    </div>
);

// --- MAIN COMPONENT ---

export const DataEntryForm: React.FC<DataEntryFormProps> = ({ onSuccess, currentUser }) => {
  const [searchId, setSearchId] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Duplicate Handling
  const [duplicateFindings, setDuplicateFindings] = useState<DuplicateFinding[]>([]);
  const [showDupModal, setShowDupModal] = useState(false);

  // Load Admin Settings for Checklist
  const [adminSettings, setAdminSettings] = useState<AdminSettings>(DataService.getAdminSettings());

  // Get active project to initialize form data
  const activeProject = DataService.getActiveProject();

  const [formData, setFormData] = useState<Partial<ApplicationData>>({
    id: '',
    projectId: activeProject?.id || '', // Explicitly set active project ID
    lifecycleStage: 'STAGING',
    entryTimestamp: new Date().toISOString(),
    physicalReceiptTimestamp: new Date().toISOString().slice(0, 16),
    operatorId: currentUser,
    
    // Personal
    applicantName: '',
    fatherOrSpouseName: '',
    dob: '',
    gender: 'Male',
    category: 'General',
    isSpecialCategory: false,
    
    // Contact
    phonePrimary: '',
    phoneAlt: '',
    aadhaar: '',
    pan: '',
    
    // Financial
    bankAccount: '',
    ifsc: '',
    income: 0,
    
    // Address
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    
    familyMembers: [],
    // Initialize documents based on configured checklist
    documents: adminSettings.documentChecklist.map(type => ({
        type, 
        isAvailable: false, 
        versions: []
    })),
    status: AppStatus.PENDING,
    lotteryStatus: LotteryStatus.PENDING,
    notes: ''
  });

  const [scanPreview, setScanPreview] = useState<string | null>(null);
  // NEW: explicitly track scan type to correctly render PDF vs Image for Blobs
  const [scanType, setScanType] = useState<'image' | 'pdf' | 'unknown'>('unknown');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scanner Simulation State
  const [scannerStatus, setScannerStatus] = useState<'disconnected' | 'searching' | 'connected'>('disconnected');
  const [scanProgress, setScanProgress] = useState<string>('');

  const connectScanner = () => {
    setScannerStatus('searching');
    // Simulate connection to local Electron bridge
    setTimeout(() => {
        setScannerStatus('connected');
    }, 2000);
  };

  const triggerScan = () => {
    if(scannerStatus !== 'connected') return;
    setScanProgress('Requesting Local Bridge...');
    
    setTimeout(() => setScanProgress('Acquiring Page 1 from TWAIN...'), 1000);
    setTimeout(() => setScanProgress('Acquiring Page 2 from TWAIN...'), 2000);
    setTimeout(() => setScanProgress('Processing PDF (Local)...'), 3000);
    setTimeout(() => {
        setScanProgress('');
        const mockUrl = "https://picsum.photos/800/1100"; // Mock consolidated scan result
        setScanPreview(mockUrl);
        setScanType('image'); // Mock is an image
        setFormData(prev => ({ ...prev, consolidatedScanUrl: mockUrl }));
    }, 4500);
  };

  const loadApplication = (appId: string) => {
    const existing = DataService.getApplicationById(appId);
    if (existing) {
        setFormData({ ...existing, physicalReceiptTimestamp: existing.physicalReceiptTimestamp.slice(0, 16) });
        if(existing.consolidatedScanUrl) {
            setScanPreview(existing.consolidatedScanUrl);
            // Simple heuristic for existing URLs
            if (existing.consolidatedScanUrl.match(/\.(jpeg|jpg|png|webp)$/i) || existing.consolidatedScanUrl.includes('picsum')) {
                setScanType('image');
            } else {
                setScanType('pdf');
            }
        }
        setIsEditMode(true);
        setSearchId(appId);
        setShowDupModal(false);
        setDuplicateFindings([]);
    } else {
        alert("Application not found");
    }
  };

  const handleSearch = () => {
    if (!searchId) return;
    if (DataService.getApplicationById(searchId)) {
        loadApplication(searchId);
    } else {
        if(confirm("Application ID not found. Start new entry with this ID?")) {
             setFormData(prev => ({ 
                ...prev, 
                id: searchId, 
                projectId: activeProject?.id || '', // Ensure project ID is preserved on new entry
                lifecycleStage: 'STAGING',
                // Reset documents to default checklist for new app
                documents: adminSettings.documentChecklist.map(type => ({ type, isAvailable: false, versions: [] }))
            }));
            setIsEditMode(false);
        }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (name === 'id') { setIsEditMode(false); }
    if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFamilyAdd = () => {
    const newMember: FamilyMember = { id: Date.now().toString(), name: '', relation: '', aadhaar: '', age: 0 };
    setFormData(prev => ({ ...prev, familyMembers: [...(prev.familyMembers || []), newMember] }));
  };

  const updateFamilyMember = (id: string, field: keyof FamilyMember, value: any) => {
    setFormData(prev => ({ ...prev, familyMembers: prev.familyMembers?.map(m => m.id === id ? { ...m, [field]: value } : m) }));
  };

  const removeFamilyMember = (id: string) => {
    setFormData(prev => ({ ...prev, familyMembers: prev.familyMembers?.filter(m => m.id !== id) }));
  };

  const toggleDoc = (docType: string) => {
    setFormData(prev => {
      const currentDocs = prev.documents || [];
      const exists = currentDocs.find(d => d.type === docType);
      let newDocs;
      
      if (exists) {
          // Toggle existing
          newDocs = currentDocs.map(d => d.type === docType ? { ...d, isAvailable: !d.isAvailable } : d);
      } else {
          // Add if missing (edge case if settings changed mid-entry)
          newDocs = [...currentDocs, { type: docType, isAvailable: true, versions: [] }];
      }
      return { ...prev, documents: newDocs };
    });
  };

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setScanPreview(url);
      setFormData(prev => ({ ...prev, consolidatedScanUrl: url }));
      
      // Determine type strictly from file object
      if (file.type === 'application/pdf') {
          setScanType('pdf');
      } else {
          setScanType('image');
      }
    }
  };

  const executeSave = async (overrideDuplicates: DuplicateFinding[] | null = null) => {
    setIsSaving(true);
    try {
        const dataToSave = { ...formData } as ApplicationData;
        if (overrideDuplicates) {
            dataToSave.duplicateFlags = JSON.stringify(overrideDuplicates);
        }
        await DataService.saveApplication(dataToSave);
        // Toast notification would be better here, using alert for simplicity
        alert("Application Saved Successfully!");
        onSuccess();
    } catch (e) {
        alert("Error saving application. Please try again.");
        console.error(e);
    } finally {
        setIsSaving(false);
    }
  };

  const saveApplicationData = async () => {
    if (!formData.id) { alert("Application Number is required."); return; }
    setIsSaving(true);
    try {
        if (!isEditMode) {
            const exists = await DataService.checkApplicationExists(formData.id);
            if (exists) {
                alert(`CONFLICT ERROR: Application Number '${formData.id}' already exists.\n\nUse Search to load it.\n\nSave cancelled.`);
                setIsSaving(false);
                return;
            }
        }
        const duplicates = DataService.findDuplicates(formData as ApplicationData);
        if (duplicates.length > 0) {
            setDuplicateFindings(duplicates);
            setShowDupModal(true);
            setIsSaving(false);
            return;
        }
        await executeSave();
    } catch (e) {
        setIsSaving(false);
        alert("System Error. Please try again.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); saveApplicationData(); };

  const triggerConsentPrint = () => {
     // Pass current formData which now includes projectId
     const printContent = DataService.processPrintTemplate(formData as ApplicationData);
     const win = window.open('', '', 'width=800,height=900');
     if(win) {
         win.document.write(printContent);
         win.document.close();
         setTimeout(() => win.print(), 500);
     }
  };
  
  const setCurrentDate = () => {
    const now = new Date();
    // Manual construction to ensure local time is preserved in ISO format string for input
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const localDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
    
    setFormData(prev => ({ ...prev, physicalReceiptTimestamp: localDateTime }));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveApplicationData(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') { e.preventDefault(); triggerConsentPrint(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formData, isEditMode, showDupModal]); 
  
  const renderScanPreview = () => {
      if(!scanPreview) return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Scan size={64} className="mb-4 opacity-50 stroke-1" />
            <p className="font-medium text-lg">No document loaded</p>
            <p className="text-sm">Scan or upload to preview</p>
        </div>
      );
      
      // Use explicit type if available, otherwise guess
      const isImage = scanType === 'image' || (scanType === 'unknown' && (scanPreview.match(/\.(jpeg|jpg|gif|png|webp)$/i) || scanPreview.includes('picsum.photos')));
      
      if (isImage) {
          return (
             <div className="relative w-full h-full flex items-center justify-center bg-slate-900/5 p-4">
                <img src={scanPreview} alt="Scanned Document" className="max-w-full max-h-full object-contain shadow-soft rounded-lg" />
                <div className="absolute bottom-4 right-4 bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5"><FileCheck size={14}/> Image Loaded</div>
             </div>
          );
      }
      
      // Default to Object for PDF (Avoids Chrome 'This page has been blocked' iframe error)
      return (
         <div className="relative w-full h-full">
            <object data={scanPreview} type="application/pdf" className="w-full h-full border-none bg-white rounded-lg">
                <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4 text-center">
                    <p className="mb-2">Unable to display PDF preview directly.</p>
                    <a href={scanPreview} target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300 underline">Download/Open PDF</a>
                </div>
            </object>
            <div className="absolute bottom-4 right-4 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 pointer-events-none"><FileCheck size={14}/> PDF Loaded</div>
         </div>
      );
  };

  return (
    <div className="flex flex-col xl:flex-row h-full gap-6 p-6 overflow-hidden relative bg-slate-50/50">
        {/* Duplicate Resolution Modal */}
        {showDupModal && (
            <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="bg-orange-50 p-6 border-b border-orange-100 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-orange-800 flex items-center"><ShieldAlert className="mr-2"/> Duplicate Records Detected</h3>
                        <button onClick={() => setShowDupModal(false)} className="text-slate-500 hover:text-slate-800 transition-colors bg-white p-2 rounded-full hover:bg-orange-100"><X size={20}/></button>
                    </div>
                    <div className="p-6 overflow-y-auto">
                        <p className="text-slate-600 mb-6">Potential duplicates found exceeding threshold ({(adminSettings.duplicateThreshold * 100).toFixed(0)}%). Please review the matches below before proceeding.</p>
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Field Matched</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Existing App ID</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Stage</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {duplicateFindings.map((dup, i) => (
                                        <tr key={i} className={dup.matchType === 'EXACT' ? 'bg-red-50/50' : 'bg-white'}>
                                            <td className="px-4 py-3 text-sm text-slate-800 font-medium">{dup.field} <span className="text-xs text-slate-500 ml-1">({(dup.confidence * 100).toFixed(0)}%)</span></td>
                                            <td className="px-4 py-3 text-xs"><span className={`px-2.5 py-1 rounded-full font-medium ${dup.matchType === 'EXACT' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{dup.matchType}</span></td>
                                            <td className="px-4 py-3 text-sm text-slate-600 font-mono">{dup.sourceId}</td>
                                            <td className="px-4 py-3 text-xs">
                                                <span className={`px-2 py-1 rounded border flex items-center w-fit gap-1 ${dup.matchedStage === 'ARCHIVED' ? 'bg-gray-100 text-gray-700 border-gray-200' : dup.matchedStage === 'PRODUCTION' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                                                    {dup.matchedStage === 'ARCHIVED' && <Archive size={10} />}
                                                    {dup.matchedStage}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right"><button onClick={() => loadApplication(dup.sourceId)} className="text-brand-600 hover:text-brand-800 text-xs font-bold flex items-center justify-end w-full group"><ExternalLink size={14} className="mr-1 group-hover:scale-110 transition-transform"/> View Existing</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end gap-3">
                        <button onClick={() => setShowDupModal(false)} className="px-5 py-2.5 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium transition-colors">Cancel & Edit</button>
                        <button onClick={() => executeSave(duplicateFindings)} className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-md shadow-red-200 transition-colors">Ignore Warning & Save</button>
                    </div>
                </div>
            </div>
        )}

        {/* Left Side: Data Entry */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
             {/* Header */}
             <div className="flex items-center justify-between mb-6 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-200 text-brand-600">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Application Entry</h2>
                        <p className="text-sm text-slate-500">Pradhan Mantri Awas Yojana (application 1.0)</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-1.5 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all">
                        <input type="text" placeholder="Search / Load App ID..." className="outline-none text-sm w-48 text-slate-700 placeholder:text-slate-400" value={searchId} onChange={e => setSearchId(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
                        <button type="button" onClick={handleSearch} className="text-slate-400 hover:text-brand-600 transition-colors"><Search size={18} /></button>
                    </div>
                    
                    <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 font-medium bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                        <Keyboard size={14}/>
                        <span>Ctrl+S: Save</span>
                        <span className="w-px h-3 bg-slate-300 mx-1"></span>
                        <span>Ctrl+P: Print</span>
                    </div>
                </div>
            </div>

            {/* Scrollable Form Area */}
            <div className="flex-1 overflow-y-auto pr-2 pb-20 space-y-6">
                <form id="application-form" onSubmit={handleSubmit} className="space-y-6">
                    {/* Status Banner if Editing */}
                    {isEditMode && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3 text-amber-800 shadow-sm">
                            <AlertTriangle size={20} className="shrink-0" />
                            <div>
                                <p className="font-bold">Edit Mode Active</p>
                                <p className="text-sm opacity-90">You are updating an existing application ({formData.id}). Changes will be audited.</p>
                            </div>
                        </div>
                    )}

                    {/* Section 1: Core Identifiers */}
                    <SectionCard title="Application Metadata" icon={FileText} className="border-t-4 border-t-brand-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="lg:col-span-2">
                                <InputField 
                                    label="Application Number" 
                                    name="id" 
                                    placeholder="e.g. APP-2024-XXXX" 
                                    value={formData.id} 
                                    onChange={handleInputChange} 
                                    required 
                                    readOnly={isEditMode}
                                    className={`${isEditMode ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''} w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 py-2.5 font-mono font-medium`}
                                />
                                {!isEditMode && <p className="text-xs text-slate-500 mt-1.5 flex items-center"><ShieldAlert size={12} className="mr-1"/> Unique ID verification on save</p>}
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">Physical Receipt Date <span className="text-red-500">*</span></label>
                                <div className="flex gap-2">
                                    <input 
                                        type="datetime-local" 
                                        name="physicalReceiptTimestamp" 
                                        value={formData.physicalReceiptTimestamp} 
                                        onChange={handleInputChange} 
                                        required 
                                        className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 py-2.5 text-slate-800 placeholder:text-slate-400"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={setCurrentDate}
                                        className="px-3 bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-600 border border-slate-200 rounded-lg transition-colors flex items-center justify-center shadow-sm"
                                        title="Set Current Date & Time"
                                    >
                                        <Clock size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </SectionCard>

                    {/* Section 2: Personal Details */}
                    <SectionCard title="Applicant Details" icon={User}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="lg:col-span-2">
                                <InputField label="Full Name" name="applicantName" placeholder="As per Aadhaar" value={formData.applicantName} onChange={handleInputChange} required />
                            </div>
                            <div className="lg:col-span-2">
                                <InputField label="Father / Spouse Name" name="fatherOrSpouseName" value={formData.fatherOrSpouseName} onChange={handleInputChange} />
                            </div>
                            <div>
                                <InputField label="Date of Birth" name="dob" type="date" value={formData.dob} onChange={handleInputChange} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">Gender</label>
                                <select name="gender" className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 py-2.5 text-slate-800" value={formData.gender} onChange={handleInputChange}>
                                    <option>Male</option><option>Female</option><option>Transgender</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">Category</label>
                                <select name="category" className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 py-2.5 text-slate-800" value={formData.category} onChange={handleInputChange}>
                                    <option>General</option><option>OBC</option><option>SC</option><option>ST</option>
                                </select>
                            </div>
                            <div className="flex items-end pb-3">
                                <label className="flex items-center space-x-3 cursor-pointer group">
                                    <div className="relative">
                                        <input type="checkbox" name="isSpecialCategory" className="sr-only peer" checked={formData.isSpecialCategory} onChange={handleInputChange} />
                                        <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 group-hover:text-brand-700 transition-colors">Special Category (PH)</span>
                                </label>
                            </div>
                        </div>
                    </SectionCard>

                    {/* Section 3: Identity & Financial */}
                    <SectionCard title="Identity & Financial Info" icon={CreditCard}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div><InputField label="Aadhaar Number" name="aadhaar" maxLength={12} placeholder="12 Digit UID" value={formData.aadhaar} onChange={handleInputChange} required className="font-mono w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 py-2.5" /></div>
                            <div><InputField label="Primary Mobile" name="phonePrimary" maxLength={10} value={formData.phonePrimary} onChange={handleInputChange} required /></div>
                            <div><InputField label="Alternate Mobile" name="phoneAlt" maxLength={10} value={formData.phoneAlt} onChange={handleInputChange} /></div>
                            <div><InputField label="PAN Number" name="pan" value={formData.pan} onChange={handleInputChange} className="uppercase w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 py-2.5" /></div>
                            <div className="lg:col-span-2"><InputField label="Bank Account No." name="bankAccount" value={formData.bankAccount} onChange={handleInputChange} className="font-mono w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 py-2.5" /></div>
                            <div><InputField label="IFSC Code" name="ifsc" value={formData.ifsc} onChange={handleInputChange} className="uppercase w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 py-2.5" /></div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">Annual Income (₹)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-slate-400">₹</span>
                                    <input type="number" name="income" className="pl-7 w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 py-2.5 text-slate-800" value={formData.income} onChange={handleInputChange} />
                                </div>
                            </div>
                        </div>
                    </SectionCard>

                    {/* Section 4: Address */}
                    <SectionCard title="Residential Address" icon={MapPin}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="lg:col-span-2"><InputField label="Address Line 1" name="addressLine1" value={formData.addressLine1} onChange={handleInputChange} /></div>
                            <div className="lg:col-span-2"><InputField label="Address Line 2" name="addressLine2" value={formData.addressLine2} onChange={handleInputChange} /></div>
                            <div><InputField label="City" name="city" value={formData.city} onChange={handleInputChange} /></div>
                            <div><InputField label="State" name="state" value={formData.state} onChange={handleInputChange} /></div>
                            <div><InputField label="Pincode" name="pincode" value={formData.pincode} onChange={handleInputChange} /></div>
                        </div>
                    </SectionCard>

                    {/* Section 5: Family Members */}
                    <SectionCard title="Family Composition" icon={Users}>
                        <div className="space-y-3">
                            {formData.familyMembers?.map((member, idx) => (
                                <div key={member.id} className="flex flex-wrap lg:flex-nowrap gap-3 items-center bg-slate-50 p-3 rounded-lg border border-slate-100 group hover:border-brand-200 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold shrink-0">{idx + 1}</div>
                                    <input placeholder="Name" className="grow min-w-[150px] text-sm border-slate-300 rounded-md focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 py-1.5" value={member.name} onChange={(e) => updateFamilyMember(member.id, 'name', e.target.value)} />
                                    <select className="w-32 text-sm border-slate-300 rounded-md focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 py-1.5" value={member.relation} onChange={(e) => updateFamilyMember(member.id, 'relation', e.target.value)}><option value="">Relation</option><option>Spouse</option><option>Son</option><option>Daughter</option><option>Parent</option></select>
                                    <input placeholder="Aadhaar No." className="w-40 text-sm border-slate-300 rounded-md focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 py-1.5" value={member.aadhaar} onChange={(e) => updateFamilyMember(member.id, 'aadhaar', e.target.value)} />
                                    <input placeholder="Age" type="number" className="w-20 text-sm border-slate-300 rounded-md focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 py-1.5" value={member.age || ''} onChange={(e) => updateFamilyMember(member.id, 'age', e.target.value)} />
                                    <button type="button" onClick={() => removeFamilyMember(member.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={16}/></button>
                                </div>
                            ))}
                            <button type="button" onClick={handleFamilyAdd} className="flex items-center text-sm font-medium text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-lg border border-brand-100 transition-colors w-full justify-center lg:w-auto">
                                <Plus size={16} className="mr-1.5"/> Add Family Member
                            </button>
                        </div>
                    </SectionCard>

                    {/* Section 6: Checklist */}
                    <SectionCard title="Document Verification Checklist" icon={FileCheck}>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {adminSettings.documentChecklist.map((type, idx) => {
                                const isChecked = formData.documents?.find(d => d.type === type)?.isAvailable || false;
                                return (
                                    <label key={idx} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all duration-200 select-none ${isChecked ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors ${isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-white'}`}>
                                            {isChecked && <CheckCircle size={14} />}
                                        </div>
                                        <input type="checkbox" checked={isChecked} onChange={() => toggleDoc(type)} className="hidden"/>
                                        <span className={`text-sm font-medium ${isChecked ? 'text-emerald-900' : 'text-slate-600'}`}>{type}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </SectionCard>

                    {/* Notes Area */}
                    <SectionCard title="Additional Remarks" icon={FileText}>
                        <textarea 
                            name="notes" 
                            rows={3} 
                            className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200 p-3 text-slate-800 text-sm" 
                            placeholder="Enter any specific observations or notes here..." 
                            value={formData.notes || ''} 
                            onChange={handleInputChange}
                        ></textarea>
                    </SectionCard>
                </form>
            </div>

            {/* Sticky Action Footer */}
            <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 flex items-center justify-between z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <button type="button" onClick={triggerConsentPrint} className="flex items-center text-slate-600 hover:text-slate-900 font-medium px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors">
                    <Printer size={20} className="mr-2"/> Print Consent Form
                </button>
                <div className="flex gap-4">
                    <button type="button" onClick={() => { if(confirm("Discard changes?")) loadApplication('') }} className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">
                        Clear / Cancel
                    </button>
                    <button onClick={saveApplicationData} disabled={isSaving} className={`px-8 py-2.5 rounded-lg font-bold shadow-lg shadow-brand-500/30 text-white flex items-center transition-all transform hover:-translate-y-0.5 ${isSaving ? 'bg-slate-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400'}`}>
                        {isSaving ? <Loader className="animate-spin mr-2" size={20}/> : <Save size={20} className="mr-2"/>} {isSaving ? 'Saving...' : 'Save Application'}
                    </button>
                </div>
            </div>
        </div>

        {/* Right Side: Scanner/Preview Panel */}
        <div className="w-full xl:w-[400px] bg-slate-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden border border-slate-700 shrink-0 h-[600px] xl:h-full">
            <div className="bg-slate-900 p-5 shrink-0 border-b border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-white flex items-center gap-2"><Scan className="text-brand-400"/> Document Scanner</h3>
                    <div className={`flex items-center text-xs px-2.5 py-1 rounded-full font-medium border ${scannerStatus === 'connected' ? 'bg-emerald-950/50 border-emerald-800 text-emerald-400' : 'bg-rose-950/50 border-rose-800 text-rose-400'}`}>
                        {scannerStatus === 'connected' ? <Wifi size={12} className="mr-1.5"/> : <WifiOff size={12} className="mr-1.5"/>}
                        {scannerStatus === 'connected' ? 'Online' : 'Offline'}
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                    {scannerStatus !== 'connected' ? (
                        <button onClick={connectScanner} disabled={scannerStatus === 'searching'} className="bg-slate-700 hover:bg-slate-600 text-slate-200 py-2.5 rounded-lg text-sm font-medium flex justify-center items-center transition-all border border-slate-600">
                            {scannerStatus === 'searching' ? <Loader className="animate-spin mr-2" size={16}/> : <Wifi size={16} className="mr-2"/>}
                            {scannerStatus === 'searching' ? 'Connecting...' : 'Connect Bridge'}
                        </button>
                    ) : (
                        <button onClick={triggerScan} disabled={!!scanProgress} className="bg-brand-600 hover:bg-brand-500 text-white py-2.5 rounded-lg text-sm font-medium flex justify-center items-center shadow-lg shadow-brand-900/50 transition-all active:scale-95">
                            {scanProgress ? <Loader className="animate-spin mr-2" size={16}/> : <Scan size={16} className="mr-2"/>}
                            {scanProgress ? 'Scanning...' : 'Scan Now'}
                        </button>
                    )}
                    <button onClick={() => fileInputRef.current?.click()} className="bg-slate-700 hover:bg-slate-600 text-slate-200 py-2.5 rounded-lg text-sm font-medium flex justify-center items-center transition-all border border-slate-600">
                        <UploadCloud size={16} className="mr-2" /> Upload File
                    </button>
                </div>
            </div>
            
            <div className="flex-1 bg-slate-900/50 relative overflow-hidden flex flex-col items-center justify-center p-4">
                <input type="file" accept="image/*,.pdf" className="hidden" ref={fileInputRef} onChange={handleManualUpload} />
                
                {scanProgress && (
                    <div className="absolute inset-0 bg-slate-900/90 z-20 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                        <div className="w-16 h-16 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mb-4"></div>
                        <p className="font-mono text-sm text-brand-400 animate-pulse">{scanProgress}</p>
                    </div>
                )}
                
                <div className="w-full h-full rounded-xl overflow-hidden border border-slate-700 bg-slate-800 shadow-inner">
                    {renderScanPreview()}
                </div>
            </div>

            <div className="bg-slate-900 p-3 text-center border-t border-slate-700">
                <p className="text-[10px] text-slate-500">Supported: Canon DR-C225 (TWAIN) • PDF/JPG/PNG</p>
            </div>
        </div>
    </div>
  );
};
