
import React, { useState, useEffect } from 'react';
import { User, UserRole, BrandingConfig, Project } from './types';
import { LayoutDashboard, FileInput, CheckSquare, Settings, LogOut, UserCircle, Lock, ChevronLeft, ChevronRight, FolderRoot, ArrowRight } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { DataEntryForm } from './components/DataEntryForm';
import { ValidationWorkspace } from './components/ValidationWorkspace';
import { AdminPanel } from './components/AdminPanel';
import { DataService } from './services/dataService';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [branding, setBranding] = useState<BrandingConfig>(DataService.getBrandingConfig());
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });
  
  // Apply Branding Theme
  useEffect(() => {
      const root = document.documentElement;
      let primary = branding.primaryColor || '#14b8a6'; // Default Teal

      // Helper: Parse Hex to RGB
      const hexToRgb = (hex: string) => {
          let c: any;
          if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
              c= hex.substring(1).split('');
              if(c.length== 3){
                  c= [c[0], c[0], c[1], c[1], c[2], c[2]];
              }
              c= '0x'+c.join('');
              return [(c>>16)&255, (c>>8)&255, c&255];
          }
          return [20, 184, 166]; // Default Teal fallback
      }

      // Helper: Mix color with White (Tint) or Black (Shade)
      const mix = (c1: number[], c2: number[], weight: number) => {
          const w = weight / 100;
          const w1 = 1 - w;
          return [
              Math.round(c1[0] * w1 + c2[0] * w),
              Math.round(c1[1] * w1 + c2[1] * w),
              Math.round(c1[2] * w1 + c2[2] * w)
          ];
      }

      const rgbToHex = (r: number, g: number, b: number) => {
          return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
      }

      const baseRgb = hexToRgb(primary);
      const white = [255, 255, 255];
      const black = [0, 0, 0];

      // Generate Palette: 50-950
      const palette = {
          50: mix(baseRgb, white, 95),
          100: mix(baseRgb, white, 90),
          200: mix(baseRgb, white, 75),
          300: mix(baseRgb, white, 50),
          400: mix(baseRgb, white, 25),
          500: baseRgb, // Primary
          600: mix(baseRgb, black, 10),
          700: mix(baseRgb, black, 30),
          800: mix(baseRgb, black, 50),
          900: mix(baseRgb, black, 70),
          950: mix(baseRgb, black, 85),
      };

      // Set CSS Variables
      Object.entries(palette).forEach(([key, rgb]) => {
          root.style.setProperty(`--brand-${key}`, rgbToHex(rgb[0], rgb[1], rgb[2]));
      });
      
      // Set RGB variable for opacity usage (e.g. shadows)
      root.style.setProperty('--brand-500-rgb', baseRgb.join(','));

  }, [branding]);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isSidebarCollapsed.toString());
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await DataService.authenticate(username, password);
      if (user) {
          setCurrentUser(user);
          setLoginError('');
          // Do NOT set activeTab yet; wait for project selection
      } else {
          setLoginError("Invalid credentials.");
      }
    } catch (error) {
      setLoginError("An error occurred during login.");
      console.error(error);
    }
  };

  const handleProjectSelect = (proj: Project) => {
      setActiveProject(proj);
      DataService.setActiveProject(proj.id);
      
      // Set tab based on role
      if(currentUser?.role === UserRole.DEO) setActiveTab('entry');
      else if (currentUser?.role === UserRole.VALIDATOR) setActiveTab('validate');
      else setActiveTab('dashboard');
  };

  const handleLogout = () => {
      setCurrentUser(null);
      setActiveProject(null);
      DataService.setActiveProject(null);
  };

  const handleSwitchProject = () => {
      setActiveProject(null);
      DataService.setActiveProject(null);
  };

  const handleBrandingUpdate = (newConfig: BrandingConfig) => {
    setBranding(newConfig);
  };

  // Helper for friendly role names
  const getFriendlyRole = (role: UserRole) => {
      switch(role) {
          case UserRole.ADMIN: return 'System Administrator';
          case UserRole.DEO: return 'Data Entry Operator';
          case UserRole.VALIDATOR: return 'Verification Officer';
          case UserRole.VIEWER: return 'Dashboard Viewer';
          default: return role;
      }
  };

  // 1. Login Screen
  if (!currentUser) {
    return (
      <div 
        className="min-h-screen bg-slate-50 flex items-center justify-center bg-cover bg-center transition-all duration-1000"
        style={branding.loginBackgroundUrl ? { backgroundImage: `url(${branding.loginBackgroundUrl})` } : {}}
      >
        {branding.loginBackgroundUrl && <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"></div>}

        <div className="bg-white/90 backdrop-blur-md p-10 rounded-2xl shadow-2xl w-full max-w-md relative z-10 border border-white/40 ring-1 ring-black/5">
          <div className="text-center mb-10">
            {branding.logoUrl && (
                <img src={branding.logoUrl} alt="Logo" className="h-20 w-auto mx-auto mb-6 object-contain drop-shadow-sm" />
            )}
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{branding.loginHeader}</h1>
            <p className="text-slate-500 mt-3 font-medium">{branding.loginSubtitle}</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Username</label>
                  <div className="relative group">
                      <UserCircle className="absolute left-3 top-3 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20}/>
                      <input type="text" value={username} onChange={e => setUsername(e.target.value)} 
                          className="pl-10 block w-full bg-slate-50 border-slate-200 rounded-xl p-2.5 focus:ring-brand-500 focus:border-brand-500 transition-all shadow-sm" 
                          placeholder="Enter your ID" />
                  </div>
              </div>
              <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Password</label>
                  <div className="relative group">
                      <Lock className="absolute left-3 top-3 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20}/>
                      <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                          className="pl-10 block w-full bg-slate-50 border-slate-200 rounded-xl p-2.5 focus:ring-brand-500 focus:border-brand-500 transition-all shadow-sm" 
                          placeholder="••••••••" />
                  </div>
              </div>
              
              {loginError && <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm text-center font-medium flex items-center justify-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>{loginError}</div>}

              <button type="submit" className="w-full bg-brand-600 text-white p-3.5 rounded-xl hover:bg-brand-700 transition-all font-semibold shadow-lg shadow-brand-500/30 transform active:scale-98">
                  Sign In to Dashboard
              </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200 text-center text-xs text-slate-400 font-medium">
            {branding.loginFooter}
          </div>
        </div>
      </div>
    );
  }

  // 2. Project Selection Screen (Mandatory Interstitial)
  if (!activeProject) {
      const projects = DataService.getProjects().filter(p => p.isActive);
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
              <div className="max-w-5xl w-full">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-800">Select Project</h2>
                        <p className="text-slate-500 mt-1">Choose the housing project to work on</p>
                    </div>
                    <button onClick={handleLogout} className="flex items-center text-slate-500 hover:text-red-600 font-medium bg-white px-4 py-2 rounded-lg border shadow-sm transition-colors"><LogOut size={18} className="mr-2"/> Sign Out</button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {projects.map(proj => (
                          <button 
                            key={proj.id} 
                            onClick={() => handleProjectSelect(proj)}
                            className="bg-white p-6 rounded-2xl border-2 border-transparent hover:border-brand-500 hover:shadow-xl transition-all text-left flex flex-col h-full group ring-1 ring-slate-100">
                              <div className="bg-brand-50 text-brand-600 p-3 rounded-xl w-fit mb-4 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                                  <FolderRoot size={24} />
                              </div>
                              <h3 className="text-xl font-bold text-slate-800 mb-2">{proj.name}</h3>
                              <p className="text-sm text-slate-500 flex-grow">{proj.description}</p>
                              <div className="mt-6 flex items-center text-brand-600 font-bold text-sm uppercase tracking-wider group-hover:gap-2 transition-all">
                                  Access Project <ArrowRight size={16} className="ml-2"/>
                              </div>
                          </button>
                      ))}
                      {currentUser.role === UserRole.ADMIN && (
                          <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-center opacity-60">
                              <p className="text-slate-400 text-sm font-medium">Additional projects can be configured in the Admin Panel after selecting a default project.</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  }

  // 3. Main Application Layout
  const NavItem = ({ id, label, icon: Icon, allowedRoles }: { id: string, label: string, icon: any, allowedRoles: UserRole[] }) => {
    if (!allowedRoles.includes(currentUser.role)) return null;
    const isActive = activeTab === id;
    return (
      <button 
        onClick={() => setActiveTab(id)}
        title={isSidebarCollapsed ? label : ''}
        className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'space-x-3 px-4'} py-3.5 rounded-xl transition-all duration-200 mb-1 group relative ${isActive ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
        
        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-brand-600"></div>}
        
        <Icon size={22} className={`shrink-0 transition-colors ${isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
        
        <span className={`font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'w-0 opacity-0 ml-0' : 'w-auto opacity-100 ml-3'}`}>
          {label}
        </span>
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-800">
      {/* Sidebar */}
      <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-72'} bg-white border-r border-slate-200 flex flex-col z-30 transition-all duration-300 relative shadow-xl shadow-slate-200/50`}>
        
        {/* Toggle Button */}
        <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute -right-3 top-8 bg-white border border-slate-200 rounded-full p-1.5 shadow-md text-slate-400 hover:text-brand-600 z-50 focus:outline-none hover:scale-110 transition-all">
            {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className={`p-6 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start'} h-24 transition-all duration-300`}>
            <div className="flex items-center gap-3">
                 {branding.logoUrl ? (
                    <img src={branding.logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded-lg bg-slate-50 p-1" />
                 ) : (
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-500/30">
                        {branding.sidebarTitle.charAt(0)}
                    </div>
                 )}
                 <div className={`flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
                    <h1 className="text-lg font-bold text-slate-800 leading-tight">
                        {branding.sidebarTitle}
                    </h1>
                    <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full w-fit mt-1 border border-brand-100">
                        v{branding.sidebarVersion}
                    </span>
                 </div>
            </div>
        </div>
        
        <nav className="flex-1 px-4 py-2 overflow-y-auto overflow-x-hidden space-y-1 custom-scrollbar">
          <div className={`text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 mt-2 px-4 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>Main Menu</div>
          <NavItem id="dashboard" label="Dashboard" icon={LayoutDashboard} allowedRoles={[UserRole.ADMIN, UserRole.VIEWER]} />
          <NavItem id="entry" label="Data Entry" icon={FileInput} allowedRoles={[UserRole.ADMIN, UserRole.DEO]} />
          <NavItem id="validate" label="Validation" icon={CheckSquare} allowedRoles={[UserRole.ADMIN, UserRole.VALIDATOR]} />
          
          <div className={`my-4 border-t border-slate-100 ${isSidebarCollapsed ? 'mx-2' : 'mx-4'}`}></div>
          
          <div className={`text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-4 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>System</div>
          <NavItem id="admin" label="Admin Panel" icon={Settings} allowedRoles={[UserRole.ADMIN]} />
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          
          {/* Active Project Card in Sidebar */}
          {!isSidebarCollapsed && (
              <div className="mb-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Project</p>
                  <p className="text-sm font-bold text-brand-700 truncate" title={activeProject.name}>{activeProject.name}</p>
                  <button onClick={handleSwitchProject} className="text-[10px] text-brand-500 hover:text-brand-700 font-bold hover:underline mt-1 flex items-center">
                      Switch Project
                  </button>
              </div>
          )}

          <div className={`flex items-center gap-3 mb-4 p-2 rounded-xl bg-white border border-slate-100 shadow-sm ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                <UserCircle size={24} />
            </div>
            <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isSidebarCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
              <p className="text-sm font-bold text-slate-800 truncate">{currentUser.fullName}</p>
              <p className="text-xs text-slate-500 truncate flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> {getFriendlyRole(currentUser.role)}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout} 
            title={isSidebarCollapsed ? "Sign Out" : ""}
            className={`flex items-center text-slate-500 hover:text-red-600 hover:bg-red-50 text-sm font-medium w-full transition-all p-2 rounded-lg group ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <LogOut size={18} className="shrink-0 group-hover:scale-110 transition-transform" /> 
            <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isSidebarCollapsed ? 'w-0 opacity-0 ml-0' : 'w-auto opacity-100 ml-3'}`}>
                Sign Out
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col relative transition-all duration-300 bg-slate-100">
        <header className="bg-white h-20 border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm z-20">
          <div>
               <h2 className="text-2xl font-bold text-slate-800 capitalize tracking-tight">
                 {activeTab === 'entry' ? 'Data Capture' : activeTab.replace('-', ' ')}
               </h2>
               <p className="text-sm text-slate-500 flex items-center gap-2">
                   Project: <span className="font-bold text-brand-600">{activeProject.name}</span>
               </p>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden md:flex flex-col items-end">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">System Time</span>
                <span className="text-sm font-mono font-medium text-slate-700 bg-slate-100 px-3 py-1 rounded-md border border-slate-200">
                    {new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true, hour: '2-digit', minute: '2-digit' })}
                </span>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative p-0">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'entry' && <DataEntryForm onSuccess={() => setActiveTab('dashboard')} currentUser={currentUser.username} />}
          {activeTab === 'validate' && <ValidationWorkspace currentUser={currentUser.username} />}
          {activeTab === 'admin' && <AdminPanel onBrandingUpdate={handleBrandingUpdate} />}
        </div>
      </main>
    </div>
  );
}

export default App;
