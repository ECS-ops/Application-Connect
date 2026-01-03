
import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { DataService } from '../services/dataService';
import { Download, Users, Activity, AlertCircle, Filter, Calendar, X, RefreshCw, Layers, BarChart3, CheckCircle, Search, FileText, User as UserIcon, TrendingUp } from 'lucide-react';
import { ApplicationData, LifecycleStage, AppStatus, Project, User } from '../types';

const COLORS = {
  eligible: '#10b981', 
  notEligible: '#f43f5e', 
  pending: '#f59e0b', 
  primary: '#14b8a6', 
  gender: ['#3b82f6', '#ec4899', '#8b5cf6'], 
  special: ['#f97316', '#94a3b8'] 
};

export const Dashboard: React.FC = () => {
  // Data State
  const [rawData, setRawData] = useState<ApplicationData[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter State
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterGender, setFilterGender] = useState('All');
  const [filterStatus, setFilterStatus] = useState<AppStatus | 'All'>('All');
  const [filterUser, setFilterUser] = useState('All');
  
  // Implicitly filters by PRODUCTION ('Validated Data')
  const [filterLifecycle] = useState<LifecycleStage>('PRODUCTION');

  const adminSettings = DataService.getAdminSettings();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
        await DataService.syncApplications();
        // Fetch ALL data global to support "All Projects" view
        setRawData(DataService.getAllApplicationsGlobal());
        setProjects(DataService.getProjects());
        setUsers(DataService.getUsers());
        
        // Default to active project if set, otherwise ALL
        const active = DataService.getActiveProject();
        if (active) setSelectedProjectId(active.id);
        else setSelectedProjectId('ALL');

    } catch (e) {
        console.error("Failed to load dashboard data", e);
    } finally {
        setIsRefreshing(false);
    }
  };

  const filteredData = useMemo(() => {
    return rawData.filter(app => {
        let matches = true;

        // 1. Lifecycle (Validated Data Only)
        if (app.lifecycleStage !== filterLifecycle) matches = false;

        // 2. Project Filter
        if (selectedProjectId !== 'ALL' && app.projectId !== selectedProjectId) matches = false;

        // 3. Status/Category/Gender Filters
        if (filterStatus !== 'All' && app.status !== filterStatus) matches = false;
        if (filterCategory !== 'All' && app.category !== filterCategory) matches = false;
        if (filterGender !== 'All' && app.gender !== filterGender) matches = false;
        
        // 4. User Filter (Operator OR Validator)
        if (filterUser !== 'All') {
            const isInvolved = app.operatorId === filterUser || app.validatorId === filterUser;
            if (!isInvolved) matches = false;
        }
        
        // 5. Date Filters
        if (filterDateFrom) {
            if (new Date(app.physicalReceiptTimestamp) < new Date(filterDateFrom)) matches = false;
        }
        if (filterDateTo) {
            // Add one day to include the end date fully
            const endDate = new Date(filterDateTo);
            endDate.setHours(23, 59, 59);
            if (new Date(app.physicalReceiptTimestamp) > endDate) matches = false;
        }
        return matches;
    });
  }, [rawData, selectedProjectId, filterLifecycle, filterDateFrom, filterDateTo, filterCategory, filterGender, filterStatus, filterUser]);

  // Statistics Calculation
  const stats = useMemo(() => {
      const total = filteredData.length;
      const eligible = filteredData.filter(a => a.status === AppStatus.ELIGIBLE).length;
      const notEligible = filteredData.filter(a => a.status === AppStatus.NOT_ELIGIBLE).length;
      const pending = filteredData.filter(a => a.status === AppStatus.PENDING).length;

      const byCategory: any = {};
      const byGender: any = {};
      filteredData.forEach(a => {
          byCategory[a.category] = (byCategory[a.category] || 0) + 1;
          byGender[a.gender] = (byGender[a.gender] || 0) + 1;
      });

      return { total, eligible, notEligible, pending, byCategory, byGender };
  }, [filteredData]);

  const genderChartData = Object.keys(stats.byGender).map(key => ({ name: key, value: stats.byGender[key] }));
  const categoryChartData = Object.keys(stats.byCategory).map(key => ({ name: key, value: stats.byCategory[key] }));

  const statusChartData = [
      { name: 'Eligible', value: stats.eligible, color: COLORS.eligible },
      { name: 'Rejected', value: stats.notEligible, color: COLORS.notEligible },
      { name: 'Pending', value: stats.pending, color: COLORS.pending }
  ];

  const timelineChartData = useMemo(() => {
      const grouped: Record<string, number> = {};
      filteredData.forEach(app => {
          if (!app.physicalReceiptTimestamp) return;
          // Use YYYY-MM-DD for stable sorting
          const dateKey = new Date(app.physicalReceiptTimestamp).toISOString().split('T')[0];
          grouped[dateKey] = (grouped[dateKey] || 0) + 1;
      });

      return Object.keys(grouped).sort().map(date => ({
          date,
          displayDate: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: grouped[date]
      }));
  }, [filteredData]);

  return (
    <div className="p-8 space-y-8 h-full overflow-y-auto bg-slate-50">
        {/* Header Section (Simplified to remove redundancy) */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-2">
            <div>
                <span className="bg-brand-100 text-brand-700 text-xs font-bold px-3 py-1.5 rounded border border-brand-200 uppercase tracking-wide flex items-center gap-2">
                    <CheckCircle size={14} /> Scope: Validated Data
                </span>
            </div>
            
            <div className="flex items-center gap-3">
                {/* Project Selector */}
                <div className="relative">
                    <select 
                        value={selectedProjectId} 
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="appearance-none bg-white border border-slate-300 text-slate-700 py-2 pl-4 pr-10 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent font-medium"
                    >
                        <option value="ALL">All Projects</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                        <Layers size={16} />
                    </div>
                </div>

                <button onClick={loadData} className="p-2.5 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 text-slate-600 transition-colors">
                    <RefreshCw size={20} className={`${isRefreshing ? 'animate-spin' : ''}`}/>
                </button>
            </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row flex-wrap gap-4 items-end">
            <div className="w-full md:w-auto">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">From Date</label>
                <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-full border-slate-200 rounded-lg text-sm" />
            </div>
            <div className="w-full md:w-auto">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">To Date</label>
                <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-full border-slate-200 rounded-lg text-sm" />
            </div>
            <div className="w-full md:w-auto">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Category</label>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full border-slate-200 rounded-lg text-sm min-w-[120px]">
                    <option value="All">All Categories</option>
                    <option value="General">General</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                    <option value="OBC">OBC</option>
                </select>
            </div>
            <div className="w-full md:w-auto">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Gender</label>
                <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="w-full border-slate-200 rounded-lg text-sm min-w-[120px]">
                    <option value="All">All Genders</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Transgender">Transgender</option>
                </select>
            </div>
             <div className="w-full md:w-auto">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="w-full border-slate-200 rounded-lg text-sm min-w-[120px]">
                    <option value="All">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="ELIGIBLE">Eligible</option>
                    <option value="NOT_ELIGIBLE">Rejected</option>
                </select>
            </div>
            <div className="w-full md:w-auto">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">User (Work Done)</label>
                <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="w-full border-slate-200 rounded-lg text-sm min-w-[150px]">
                    <option value="All">All Users</option>
                    {users.map(u => (
                        <option key={u.username} value={u.username}>{u.fullName}</option>
                    ))}
                </select>
            </div>
            <div className="w-full md:w-auto flex-1 flex justify-end">
                <button onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setFilterCategory('All'); setFilterGender('All'); setFilterStatus('All'); setFilterUser('All'); }} className="text-sm text-slate-500 hover:text-red-500 font-medium flex items-center gap-1 py-2">
                    <X size={16} /> Clear Filters
                </button>
            </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-slate-500 font-medium mb-1">Total Applications</p>
                        <h2 className="text-4xl font-bold text-slate-800">{stats.total}</h2>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Layers size={24}/></div>
                </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-slate-500 font-medium mb-1">Eligible</p>
                        <h2 className="text-4xl font-bold text-emerald-600">{stats.eligible}</h2>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle size={24}/></div>
                </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-slate-500 font-medium mb-1">Rejected</p>
                        <h2 className="text-4xl font-bold text-rose-600">{stats.notEligible}</h2>
                    </div>
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-xl"><AlertCircle size={24}/></div>
                </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-slate-500 font-medium mb-1">Pending Verification</p>
                        <h2 className="text-4xl font-bold text-amber-500">{stats.pending}</h2>
                    </div>
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Activity size={24}/></div>
                </div>
            </div>
        </div>

        {/* Timeline Trend Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-[320px] flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp className="text-brand-500" size={20} /> Data Entry Trend (Daily Volume)
            </h3>
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis 
                            dataKey="displayDate" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: '#64748b', fontSize: 12}} 
                            interval="preserveStartEnd"
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: '#64748b', fontSize: 12}} 
                        />
                        <Tooltip 
                            cursor={{stroke: '#cbd5e1', strokeWidth: 1}} 
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                        />
                        <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#0d9488" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorValue)" 
                            name="Applications"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-[400px] flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <BarChart3 className="text-brand-500" size={20} /> Demographics (Category)
                </h3>
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryChartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} dy={10} tick={{fill: '#64748b', fontSize: 12}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                            <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                            <Bar dataKey="value" fill={COLORS.primary} radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-[400px] flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Activity className="text-brand-500" size={20} /> Application Status
                </h3>
                <div className="flex-1 w-full min-h-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={statusChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={120}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {statusChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center Stats */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-12">
                        <span className="text-3xl font-bold text-slate-800">{stats.total}</span>
                        <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Data Table Section (Restored) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <FileText size={20} className="text-slate-400" />
                    Recent Applications ({filteredData.length})
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs">
                        <tr>
                            <th className="px-6 py-3">App ID</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Applicant Name</th>
                            <th className="px-6 py-3">Project</th>
                            <th className="px-6 py-3">Category</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Income</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredData.slice(0, 50).map((app) => (
                            <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-mono font-medium text-brand-600">{app.id}</td>
                                <td className="px-6 py-4">{new Date(app.physicalReceiptTimestamp).toLocaleDateString()}</td>
                                <td className="px-6 py-4 font-medium text-slate-800">{app.applicantName}</td>
                                <td className="px-6 py-4 text-xs text-slate-500">{app.projectId}</td>
                                <td className="px-6 py-4">
                                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs border border-slate-200">{app.category}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                                        app.status === 'ELIGIBLE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                        app.status === 'NOT_ELIGIBLE' ? 'bg-red-50 text-red-700 border-red-100' :
                                        'bg-amber-50 text-amber-700 border-amber-100'
                                    }`}>
                                        {app.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-mono">₹{app.income.toLocaleString('en-IN')}</td>
                            </tr>
                        ))}
                        {filteredData.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">No applications found matching current filters.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {filteredData.length > 50 && (
                <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-center text-xs text-slate-500">
                    Showing top 50 of {filteredData.length} records. Use filters to narrow down results.
                </div>
            )}
        </div>
    </div>
  );
};
