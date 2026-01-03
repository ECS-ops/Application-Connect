
import React, { useState } from 'react';
import { ApplicationData, AppStatus } from '../types';
import { DataService } from '../services/dataService';
import { CheckCircle, XCircle, AlertTriangle, Loader, FileText, UploadCloud, Search, Maximize2, Minimize2, X, Eye, FileCheck, ChevronRight, User, Phone, MapPin, Calendar, CreditCard, Copy, ArrowRightLeft, StickyNote, Archive } from 'lucide-react';

interface ValidationWorkspaceProps {
    currentUser: string;
}

export const ValidationWorkspace: React.FC<ValidationWorkspaceProps> = ({ currentUser }) => {
  const [selectedApp, setSelectedApp] = useState<ApplicationData | null>(null);
  const [activeTab, setActiveTab] = useState<'decision' | 'docs'>('decision');
  const [queueSearch, setQueueSearch] = useState('');
  const [isFullScreenPreview, setIsFullScreenPreview] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  
  const applications = DataService.getApplications().filter(a => {
      const isStatusMatch = a.status === AppStatus.PENDING || a.status === AppStatus.ELIGIBLE;
      const term = queueSearch.toLowerCase();
      const isSearchMatch = !term || (
          a.id.toLowerCase().includes(term) ||
          a.applicantName.toLowerCase().includes(term) ||
          a.aadhaar.includes(term)
      );
      return isStatusMatch && isSearchMatch;
  });

  const adminSettings = DataService.getAdminSettings();
  
  const [remarks, setRemarks] = useState('');
  const [rejectReason, setRejectReason] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadDocType, setUploadDocType] = useState<string>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Duplicate Logic Calculation
  const duplicates = selectedApp ? DataService.findDuplicates(selectedApp) : [];
  const matchedAppId = duplicates.length > 0 ? duplicates[0].sourceId : null;
  const matchedApp = matchedAppId ? DataService.getApplicationById(matchedAppId) : null;

  const handleValidation = async (status: AppStatus) => {
    if (!selectedApp) return;

    if (status === AppStatus.NOT_ELIGIBLE && !rejectReason) {
        alert("Please select a rejection reason.");
        return;
    }

    setIsProcessing(true);
    
    try {
        const auditEntry = {
            timestamp: new Date().toISOString(),
            userId: currentUser,
            action: status === AppStatus.ELIGIBLE ? 'VALIDATION_APPROVED' : 'VALIDATION_REJECTED',
            details: status === AppStatus.NOT_ELIGIBLE ? `Rejected: ${rejectReason}. Notes: ${remarks}` : `Eligible. Notes: ${remarks}`
        };

        const updatedApp: ApplicationData = {
            ...selectedApp,
            status: status,
            rejectionReason: status === AppStatus.NOT_ELIGIBLE ? rejectReason : undefined,
            validationRemarks: remarks,
            validationTimestamp: new Date().toISOString(),
            validatorId: currentUser,
            auditLog: [...(selectedApp.auditLog || []), auditEntry]
        };

        await DataService.saveApplication(updatedApp);
        // Reset state
        setSelectedApp(null); 
        setRemarks('');
        setRejectReason('');
        setActiveTab('decision');
        setShowDuplicateModal(false);
    } catch (e) {
        alert("Error saving validation status. Please try again.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDocumentUpload = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedApp || !uploadDocType || !uploadFile) return;

      setIsUploading(true);
      try {
          const updatedApp = await DataService.uploadDocumentVersion(
              selectedApp.id, 
              uploadDocType, 
              uploadFile, 
              currentUser
          );
          setSelectedApp(updatedApp);
          alert("Document uploaded successfully!");
          setUploadFile(null);
          setUploadDocType('');
      } catch (err: any) {
          alert("Upload failed: " + err.message);
      } finally {
          setIsUploading(false);
      }
  };

  const renderDocumentPreview = (url: string | undefined, isFull: boolean) => {
      if (!url) {
          return (
             <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <div className="p-4 rounded-full bg-slate-800 mb-4">
                     <FileText size={32} className="opacity-50"/>
                </div>
                <p className="font-medium">Document Source Unavailable</p>
                <p className="text-xs opacity-70 mt-1">No consolidated scan attached</p>
             </div>
          );
      }

      // Robust check for images. If it's a blob without extension, we assume PDF (iframe) if it's not obviously an image.
      // Most blob URLs created from images won't match regex, but in validation context, we might rely on the fallback.
      const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || url.includes('picsum.photos');

      if (isImage) {
          return <img src={url} className="max-w-full max-h-full object-contain shadow-lg rounded-md bg-white" alt="Doc Preview" />;
      }
      
      // Fallback for PDFs or Blob URLs that are PDFs
      // Using <object> to prevent iframe security blocking issues in Chrome
      return (
        <object data={url} type="application/pdf" className="w-full h-full border-none bg-white rounded-md shadow-sm">
             <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50">
                <AlertTriangle size={24} className="mb-2 opacity-50"/>
                <p className="text-sm font-medium">Preview Not Supported</p>
                <a href={url} target="_blank" rel="noreferrer" className="mt-2 text-brand-600 hover:text-brand-700 text-xs font-bold uppercase tracking-wide border border-brand-200 px-3 py-1.5 rounded-lg bg-white hover:shadow-sm transition-all">
                    Open Document Externally
                </a>
             </div>
        </object>
      );
  };

  // Helper for Comparison Rows
  const CompareRow = ({ label, val1, val2, highlight = false, icon: Icon }: any) => (
      <div className={`grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 ${highlight ? 'bg-orange-50/40' : 'bg-white'}`}>
          <div className="p-4 flex items-start gap-3">
             <div className="bg-slate-50 p-1.5 rounded text-slate-400 shrink-0">
                {Icon ? <Icon size={16} /> : <FileText size={16} />}
             </div>
             <div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
                 <p className={`text-sm font-medium ${val1 === val2 ? 'text-slate-800' : 'text-slate-900'}`}>{val1 || '-'}</p>
             </div>
          </div>
          <div className={`p-4 ${highlight ? 'bg-orange-50/30' : ''}`}>
             <div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
                 <p className={`text-sm font-medium ${val1 === val2 ? 'text-slate-800' : 'text-orange-700 font-bold flex items-center gap-2'}`}>
                     {val2 || '-'}
                     {val1 === val2 && <CheckCircle size={14} className="text-emerald-500" />}
                     {val1 !== val2 && <AlertTriangle size={14} className="text-orange-500" />}
                 </p>
             </div>
          </div>
      </div>
  );

  return (
    <div className="flex h-full gap-6 p-6 bg-slate-50/50">
        {/* Duplicate Comparison Modal */}
        {showDuplicateModal && selectedApp && matchedApp && (
            <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
                <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 ring-1 ring-white/20">
                    
                    {/* 1. Modal Header */}
                    <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-white z-10">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <span className="bg-orange-100 text-orange-600 p-2 rounded-lg"><ArrowRightLeft size={20} /></span>
                                Duplicate Resolution Analysis
                            </h2>
                            <p className="text-sm text-slate-500 mt-1 ml-11">Comparing incoming data against existing database records.</p>
                        </div>
                        <button onClick={() => setShowDuplicateModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-800"><X size={24}/></button>
                    </div>
                    
                    {/* 2. Column Headers (Sticky) */}
                    <div className="grid grid-cols-2 divide-x divide-slate-200 border-b border-slate-200 bg-slate-50 shadow-sm z-10 shrink-0">
                        {/* Left Header */}
                        <div className="p-4 bg-brand-50/30 border-t-4 border-brand-500">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold bg-brand-100 text-brand-700 px-2 py-0.5 rounded uppercase tracking-wider">Current (Incoming)</span>
                                <span className="text-xs text-slate-400">Status: {selectedApp.status}</span>
                            </div>
                            <div className="font-mono text-lg font-bold text-slate-800">{selectedApp.id}</div>
                        </div>

                        {/* Right Header */}
                        <div className={`p-4 border-t-4 ${matchedApp.lifecycleStage === 'ARCHIVED' ? 'bg-slate-100 border-slate-500' : 'bg-orange-50/30 border-orange-500'}`}>
                            <div className="flex justify-between items-center mb-1">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 ${matchedApp.lifecycleStage === 'ARCHIVED' ? 'bg-slate-200 text-slate-600' : 'bg-orange-100 text-orange-800'}`}>
                                    {matchedApp.lifecycleStage === 'ARCHIVED' ? <Archive size={12}/> : <AlertTriangle size={12}/>}
                                    {matchedApp.lifecycleStage === 'ARCHIVED' ? 'Archived Record' : 'Existing (Conflict)'}
                                </span>
                                <span className="text-xs text-slate-500 font-bold">Stage: {matchedApp.lifecycleStage}</span>
                            </div>
                            <div className="font-mono text-lg font-bold text-slate-800">{matchedApp.id}</div>
                        </div>
                    </div>
                    
                    {/* 3. Scrollable Comparison Body */}
                    <div className="flex-1 overflow-y-auto bg-slate-50/50">
                        <div className="bg-white shadow-sm mx-auto min-h-full">
                            <CompareRow icon={User} label="Applicant Name" val1={selectedApp.applicantName} val2={matchedApp.applicantName} />
                            <CompareRow icon={User} label="Father/Spouse Name" val1={selectedApp.fatherOrSpouseName} val2={matchedApp.fatherOrSpouseName} />
                            <CompareRow icon={Calendar} label="Date of Birth" val1={selectedApp.dob} val2={matchedApp.dob} />
                            <CompareRow icon={User} label="Gender" val1={selectedApp.gender} val2={matchedApp.gender} />
                            <CompareRow icon={CreditCard} label="Aadhaar Number" val1={selectedApp.aadhaar} val2={matchedApp.aadhaar} highlight={selectedApp.aadhaar === matchedApp.aadhaar} />
                            <CompareRow icon={Phone} label="Primary Mobile" val1={selectedApp.phonePrimary} val2={matchedApp.phonePrimary} highlight={selectedApp.phonePrimary === matchedApp.phonePrimary} />
                            <CompareRow icon={MapPin} label="Address" val1={`${selectedApp.addressLine1}, ${selectedApp.city}`} val2={`${matchedApp.addressLine1}, ${matchedApp.city}`} />
                            <CompareRow icon={CreditCard} label="Bank Account" val1={selectedApp.bankAccount} val2={matchedApp.bankAccount} />
                            <CompareRow icon={CreditCard} label="Annual Income" val1={`₹ ${selectedApp.income.toLocaleString('en-IN')}`} val2={`₹ ${matchedApp.income.toLocaleString('en-IN')}`} />
                            
                            {/* Match Analysis Block */}
                            <div className="p-6">
                                <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
                                    <h4 className="text-sm font-bold text-orange-800 mb-3 border-b border-orange-200 pb-2 flex items-center gap-2">
                                        <Search size={16}/> System Match Analysis
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {duplicates.map((d, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-white border border-orange-100 px-3 py-2 rounded-lg shadow-sm">
                                                <span className="font-bold text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">{d.matchType}</span>
                                                <span className="text-sm text-slate-700">Match found on <strong>{d.field}</strong></span>
                                                <span className="text-xs text-slate-400 border-l border-slate-200 pl-2 ml-1">{(d.confidence * 100).toFixed(0)}% Confidence</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. Footer */}
                    <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3 z-10">
                        <button onClick={() => setShowDuplicateModal(false)} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors shadow-sm">
                            Close Comparison
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Full Screen Modal */}
        {isFullScreenPreview && selectedApp && (
            <div className="fixed inset-0 z-50 bg-slate-900/95 flex flex-col backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-slate-900 text-white px-6 py-3 flex justify-between items-center shadow-md shrink-0 border-b border-slate-700">
                    <h2 className="font-bold text-lg flex items-center gap-3">
                        <FileText size={20} className="text-brand-400"/> 
                        <span className="font-mono text-slate-300">{selectedApp.id}</span>
                        <span className="text-slate-500">/</span>
                        <span>Consolidated Document View</span>
                    </h2>
                    <button 
                        onClick={() => setIsFullScreenPreview(false)} 
                        className="bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-colors text-white"
                        title="Close Full Screen (Esc)"
                    >
                        <X size={24}/>
                    </button>
                </div>
                <div className="flex-1 overflow-hidden relative flex justify-center p-4">
                    {renderDocumentPreview(selectedApp.consolidatedScanUrl, true)}
                </div>
            </div>
        )}

        {/* Sidebar: Queue */}
        <div className="w-80 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden shrink-0">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-700">Validation Queue</h3>
                    <span className="bg-brand-100 text-brand-700 text-xs px-2 py-0.5 rounded-full font-bold">{applications.length}</span>
                </div>
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Search ID, Name..." 
                        className="w-full pl-9 pr-3 py-2 text-sm border-slate-200 rounded-lg focus:ring-brand-500 focus:border-brand-500 bg-white shadow-sm transition-all"
                        value={queueSearch}
                        onChange={(e) => setQueueSearch(e.target.value)}
                    />
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                </div>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-2 custom-scrollbar">
                {applications.map(app => (
                    <div key={app.id} 
                        onClick={() => !isProcessing && setSelectedApp(app)}
                        className={`p-3 rounded-lg cursor-pointer border transition-all duration-200 group relative overflow-hidden ${selectedApp?.id === app.id ? 'bg-brand-50 border-brand-200 shadow-md z-10' : 'bg-white border-slate-100 hover:border-brand-200 hover:shadow-sm'} ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                        
                        {selectedApp?.id === app.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500"></div>}
                        
                        <div className="flex justify-between items-start mb-1 pl-2">
                            <div className={`font-bold text-sm ${selectedApp?.id === app.id ? 'text-brand-900' : 'text-slate-700'}`}>{app.id}</div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${app.status === 'ELIGIBLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{app.status}</span>
                        </div>
                        <div className="pl-2">
                            <div className="text-sm text-slate-600 font-medium truncate">{app.applicantName}</div>
                            <div className="text-xs text-slate-400 mt-1 flex justify-between">
                                <span>{new Date(app.entryTimestamp).toLocaleDateString()}</span>
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-brand-500 flex items-center gap-1">Open <ChevronRight size={10}/></span>
                            </div>
                        </div>
                    </div>
                ))}
                {applications.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                        <CheckCircle size={32} className="mb-2 opacity-20"/>
                        <p className="text-sm font-medium">All caught up!</p>
                        <p className="text-xs opacity-70">No pending apps.</p>
                    </div>
                )}
            </div>
        </div>

        {/* Main Workspace */}
        {selectedApp ? (
            <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-slate-200 bg-slate-50/50">
                    <button onClick={() => setActiveTab('decision')} className={`px-6 py-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'decision' ? 'border-brand-600 text-brand-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>
                        <CheckCircle size={16}/> Verification Console
                    </button>
                    <button onClick={() => setActiveTab('docs')} className={`px-6 py-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'docs' ? 'border-brand-600 text-brand-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>
                        <FileText size={16}/> Document Manager <span className="ml-1.5 bg-slate-200 text-slate-600 text-xs px-1.5 py-0.5 rounded-full">{selectedApp.documents.filter(d => d.isAvailable).length}</span>
                    </button>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    {activeTab === 'decision' ? (
                        <div className="flex h-full">
                            {/* Left: Document Viewer */}
                            <div className="w-3/5 bg-slate-900 flex flex-col relative border-r border-slate-700 group">
                                <div className="p-2 bg-slate-950 text-slate-400 text-xs font-mono flex justify-between items-center shrink-0 border-b border-slate-800">
                                    <div className="flex items-center gap-2"><Eye size={12}/> Consolidated View</div>
                                    <div className="opacity-70">{selectedApp.id}.pdf</div>
                                </div>
                                <div className="flex-1 flex items-center justify-center bg-slate-800 overflow-hidden relative p-4">
                                    {renderDocumentPreview(selectedApp.consolidatedScanUrl, false)}
                                    
                                    {selectedApp.consolidatedScanUrl && (
                                        <button 
                                            onClick={() => setIsFullScreenPreview(true)}
                                            className="absolute top-6 right-6 bg-black/50 hover:bg-black/80 text-white p-2.5 rounded-lg shadow-lg backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 transform hover:scale-105"
                                            title="Maximize Preview"
                                        >
                                            <Maximize2 size={20} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Right: Data & Decision */}
                            <div className="w-2/5 overflow-y-auto p-6 bg-white flex flex-col">
                                <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-5 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-sm">1</span> 
                                    Validate Data
                                </h3>
                                
                                <div className="space-y-4 text-sm mb-8 flex-1">
                                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 space-y-3">
                                        <div className="flex justify-between"><span className="text-slate-500">Applicant Name</span><span className="font-bold text-slate-800 text-right">{selectedApp.applicantName}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500">Father/Spouse</span><span className="font-medium text-slate-800 text-right">{selectedApp.fatherOrSpouseName}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500">Annual Income</span><span className="font-medium text-slate-800 text-right">₹ {selectedApp.income.toLocaleString('en-IN')}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500">Category</span><span className="font-medium text-slate-800 text-right">{selectedApp.category}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500">Special Category (PH)</span><span className="font-medium text-slate-800 text-right">{selectedApp.isSpecialCategory ? 'Yes' : 'No'}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500">Aadhaar No.</span><span className="font-mono font-medium text-slate-800 text-right tracking-wide">{selectedApp.aadhaar}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500">Primary Mobile</span><span className="font-mono font-medium text-slate-800 text-right">{selectedApp.phonePrimary}</span></div>
                                    </div>
                                    
                                    {selectedApp.notes && (
                                        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100 text-sm shadow-sm">
                                            <span className="flex items-center text-xs font-bold text-yellow-700 uppercase mb-2"><StickyNote size={12} className="mr-1"/> Operator Notes</span>
                                            <p className="text-slate-700 italic">{selectedApp.notes}</p>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center p-3 rounded-lg border border-slate-100 bg-white">
                                        <span className="text-slate-500 font-medium">Duplicate Check</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`font-bold px-2 py-1 rounded text-xs uppercase ${duplicates.length > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                {duplicates.length > 0 ? 'Found Matches' : 'Passed'}
                                            </span>
                                            {duplicates.length > 0 && (
                                                <button
                                                    onClick={() => setShowDuplicateModal(true)}
                                                    className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-full transition-colors border border-red-200 shadow-sm"
                                                    title="View Comparison Details"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto">
                                    <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-5 flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-sm">2</span> 
                                        Decision
                                    </h3>
                                    
                                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Internal Remarks</label>
                                        <textarea className="w-full border-slate-300 rounded-lg p-3 text-sm mb-5 focus:ring-brand-500 focus:border-brand-500 shadow-sm" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Add validation notes here..."></textarea>

                                        {isProcessing ? (
                                            <div className="text-center py-4 text-brand-600 flex items-center justify-center font-medium bg-brand-50 rounded-lg"><Loader className="animate-spin mr-2" size={20}/> Processing Decision...</div>
                                        ) : (
                                            <div className="space-y-4">
                                                <button onClick={() => handleValidation(AppStatus.ELIGIBLE)} className="w-full bg-emerald-600 text-white py-3 rounded-lg shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 flex justify-center items-center font-bold transition-transform active:scale-98">
                                                    <CheckCircle size={20} className="mr-2"/> Approve & Mark Eligible
                                                </button>
                                                
                                                <div className="relative flex py-1 items-center">
                                                    <div className="flex-grow border-t border-slate-200"></div>
                                                    <span className="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase font-bold">OR Reject</span>
                                                    <div className="flex-grow border-t border-slate-200"></div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <select className="flex-1 border-slate-300 rounded-lg p-2.5 text-sm focus:ring-rose-500 focus:border-rose-500" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}>
                                                        <option value="">Select Reason...</option>
                                                        {adminSettings.rejectionReasons.map(r => (
                                                            <option key={r} value={r}>{r}</option>
                                                        ))}
                                                    </select>
                                                    <button onClick={() => handleValidation(AppStatus.NOT_ELIGIBLE)} className="bg-rose-600 text-white px-4 rounded-lg shadow hover:bg-rose-700 flex justify-center items-center font-bold transition-colors" title="Reject Application">
                                                        <XCircle size={20}/>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex h-full p-6 overflow-y-auto">
                            <div className="max-w-4xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-slate-800 text-lg">Document Status</h3>
                                        <span className="text-sm text-slate-500">Checking {selectedApp.documents.length} items</span>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        {selectedApp.documents.map((doc, idx) => (
                                            <div key={idx} className={`border rounded-xl p-4 transition-all ${doc.isAvailable ? 'bg-white border-brand-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-start gap-3">
                                                        <div className={`p-2 rounded-lg ${doc.isAvailable ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                                                            {doc.isAvailable ? <FileCheck size={18}/> : <FileText size={18}/>}
                                                        </div>
                                                        <div>
                                                            <h4 className={`font-bold text-sm ${doc.isAvailable ? 'text-slate-800' : 'text-slate-500'}`}>{doc.type}</h4>
                                                            <p className="text-xs text-slate-500 mt-0.5">{doc.isAvailable ? 'Marked Available' : 'Missing'}</p>
                                                        </div>
                                                    </div>
                                                    {doc.versions.length > 0 && <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full font-mono font-bold border border-blue-100">v{doc.versions[doc.versions.length - 1].version}</span>}
                                                </div>
                                                
                                                {doc.versions.length > 0 ? (
                                                    <div className="mt-3 pl-11 space-y-2">
                                                        {doc.versions.slice().reverse().map((ver) => (
                                                            <div key={ver.version} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded border border-slate-100 hover:border-brand-200 transition-colors cursor-pointer group">
                                                                <div className="flex items-center gap-2 font-medium text-slate-600 group-hover:text-brand-600">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:bg-brand-500"></span>
                                                                    {ver.fileName}
                                                                </div>
                                                                <span className="text-slate-400">{new Date(ver.uploadedAt).toLocaleDateString()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : <div className="pl-11 mt-1 text-xs text-slate-400 italic">No files uploaded.</div>}
                                                
                                                <div className="pl-11 mt-3 pt-3 border-t border-slate-100">
                                                    <button onClick={() => setUploadDocType(doc.type)} className="text-xs flex items-center text-brand-600 hover:text-brand-800 font-bold uppercase tracking-wide">
                                                        <UploadCloud size={14} className="mr-1.5"/> Upload New Version
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <div className="bg-slate-800 rounded-xl p-6 shadow-xl text-white sticky top-0">
                                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700">
                                            <div className="p-2 bg-slate-700 rounded-lg"><UploadCloud size={20} className="text-brand-400"/></div>
                                            <div>
                                                <h3 className="font-bold text-lg">Upload Manager</h3>
                                                <p className="text-slate-400 text-sm">Add digital copies to record</p>
                                            </div>
                                        </div>
                                        
                                        <form onSubmit={handleDocumentUpload} className="space-y-5">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Document Type</label>
                                                <select className="w-full bg-slate-700 border-slate-600 rounded-lg p-3 text-sm focus:ring-brand-500 focus:border-brand-500 text-white" required value={uploadDocType} onChange={(e) => setUploadDocType(e.target.value)}>
                                                    <option value="" className="text-slate-400">Select Document...</option>
                                                    {selectedApp.documents.map(d => <option key={d.type} value={d.type}>{d.type}</option>)}
                                                </select>
                                            </div>
                                            
                                            <div className="p-4 border-2 border-dashed border-slate-600 rounded-lg hover:border-slate-500 hover:bg-slate-700/50 transition-colors text-center cursor-pointer relative">
                                                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" required onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)} />
                                                <UploadCloud size={32} className="mx-auto mb-2 text-slate-500"/>
                                                <p className="text-sm font-medium text-slate-300">{uploadFile ? uploadFile.name : "Click to select file"}</p>
                                                <p className="text-xs text-slate-500 mt-1">{uploadFile ? `${(uploadFile.size/1024).toFixed(1)} KB` : "PDF, JPG, PNG supported"}</p>
                                            </div>

                                            <button type="submit" disabled={!uploadDocType || !uploadFile || isUploading} className={`w-full py-3.5 rounded-lg font-bold shadow-lg flex justify-center items-center transition-all ${!uploadDocType || !uploadFile || isUploading ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-brand-500 hover:bg-brand-400 text-white shadow-brand-900/50'}`}>
                                                {isUploading ? <Loader className="animate-spin mr-2" size={20}/> : <UploadCloud size={20} className="mr-2"/>}
                                                {isUploading ? 'Uploading...' : 'Upload & Attach'}
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl shadow-sm border border-slate-200 text-slate-400">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <Search size={40} className="opacity-20 text-slate-900"/>
                </div>
                <h3 className="text-xl font-bold text-slate-700 mb-2">Ready to Verify</h3>
                <p className="text-slate-500 max-w-xs text-center">Select an application from the queue to view documents and validate eligibility.</p>
            </div>
        )}
    </div>
  );
};
