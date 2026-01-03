
import { ApplicationData, User, Project } from '../types';

// ENVIRONMENT CONFIGURATION
// If we are on localhost (e.g. 5173), assume backend is on 5000.
// If window.location.port is already 5000, use relative.
// If domain is used (production), use relative /api.
const getApiBase = () => {
    const hostname = window.location.hostname;
    const port = window.location.port;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        if (port === '5000') return '/api'; // Being served from same origin (unlikely in dev, but possible)
        return `${window.location.protocol}//${hostname}:5000/api`;
    }
    return '/api'; // Production proxy
};

const API_BASE = getApiBase();

const getHeaders = () => {
    const token = localStorage.getItem('application_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export const ApiService = {
    login: async (username: string, password: string) => {
        try {
            console.log(`Attempting login to: ${API_BASE}/auth/login`);
            
            // INCREASED TIMEOUT to 5000ms to allow slow local backends to wake up
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 5000); 

            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                signal: controller.signal
            });
            clearTimeout(id);
            
            if (!res.ok) {
                const text = await res.text();
                let errMsg = res.statusText;
                try {
                    const json = JSON.parse(text);
                    if (json.error) errMsg = json.error;
                } catch (e) { /* ignore */ }
                
                // Throw specific error messages
                throw new Error(errMsg || 'Login failed');
            }
            return await res.json();
        } catch (e: any) {
            console.error("API Error in login:", e);
            // Distinguish between Network Error/Timeout and standard API errors
            if (e.name === 'AbortError' || e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
                throw new Error('BACKEND_UNREACHABLE');
            }
            throw e;
        }
    },

    getBannedIps: async () => {
        const res = await fetch(`${API_BASE}/admin/banned-ips`, { headers: getHeaders() });
        if (!res.ok) throw new Error("Failed to fetch banned IPs");
        return await res.json();
    },

    unlockIp: async (ip: string) => {
        const res = await fetch(`${API_BASE}/admin/unlock-ip`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ ip })
        });
        return res.json();
    },

    getProjects: async (): Promise<Project[]> => {
        const res = await fetch(`${API_BASE}/projects`, { headers: getHeaders() });
        if (!res.ok) throw new Error("Failed to fetch projects");
        const data = await res.json();
        return data.map((p: any) => ({
            ...p,
            createdAt: p.createdAt || p.created_at || new Date().toISOString()
        }));
    },

    getApplications: async (): Promise<ApplicationData[]> => {
        const res = await fetch(`${API_BASE}/applications`, { headers: getHeaders() });
        if (!res.ok) throw new Error("Failed to fetch data");
        const rawData = await res.json();
        
        return rawData.map((d: any) => ({
            ...d,
            isSpecialCategory: Boolean(d.is_special_category),
            documents: d.documents || [],
            familyMembers: d.familyMembers || []
        }));
    },

    checkApplicationExists: async (id: string): Promise<boolean> => {
        try {
             const res = await fetch(`${API_BASE}/applications/${encodeURIComponent(id)}/exists`, { headers: getHeaders() });
             if (!res.ok) return false;
             const data = await res.json();
             return data.exists;
        } catch (e) {
            console.error("Error checking app existence", e);
            return false;
        }
    },

    saveApplication: async (app: ApplicationData) => {
        const res = await fetch(`${API_BASE}/applications`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(app)
        });
        if (!res.ok) throw new Error("Save failed");
        return await res.json();
    },

    uploadDocument: async (appId: string, docType: string, file: File) => {
        const formData = new FormData();
        formData.append('appId', appId);
        formData.append('docType', docType);
        formData.append('file', file);

        const token = localStorage.getItem('application_token');
        const res = await fetch(`${API_BASE}/documents/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        if (!res.ok) throw new Error("Upload failed");
        return await res.json();
    }
};
