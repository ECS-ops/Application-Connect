require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_IN_PRODUCTION_SECRET_KEY';
const LOCKOUT_DURATION_HOURS = 24;
const MAX_ATTEMPTS = 5;

// --- Middlewares ---
app.use(helmet());
app.use(cors()); // Allows cross-origin for local development
app.use(express.json());
app.use(morgan('combined'));

// Robust path for uploads
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}
app.use('/uploads', express.static(UPLOADS_DIR));

// --- Database Setup ---
const dbPath = path.resolve(__dirname, 'application.db');
const db = new sqlite3.Database(dbPath);

// Initialize Schema
const schemaPath = path.join(__dirname, 'schema.sql');

if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.serialize(() => {
        db.run("PRAGMA journal_mode = WAL;");
        db.run("PRAGMA foreign_keys = ON;");
        
        // Split schema by semi-colon to execute statement by statement if needed, 
        // but db.exec handles multiple statements usually.
        db.exec(schema, (err) => {
            if (err) {
                console.error("CRITICAL: DB Init Error:", err.message);
            } else {
                console.log("Database initialized successfully (WAL Mode).");
                
                // 1. Clear bans on startup for dev convenience
                db.run("DELETE FROM ip_bans", [], (err) => {
                     if(!err) console.log("Security: All IP bans cleared for development session.");
                });
                
                // 2. Seed Data
                seedDefaultData();
            }
        });
    });
} else {
    console.error("CRITICAL: schema.sql not found in " + __dirname);
}

const seedDefaultData = () => {
    // FORCE RESET ADMIN PASSWORD ON STARTUP
    // This ensures that 'admin' / 'password123' ALWAYS works.
    const hash = bcrypt.hashSync('password123', 10);
    
    // We use INSERT OR REPLACE to overwrite if exists, or insert if new.
    db.run(`INSERT OR REPLACE INTO users (username, password_hash, full_name, role, is_active) 
            VALUES (?, ?, ?, ?, 1)`,
        ['admin', hash, 'System Administrator', 'ADMIN'], 
        (err) => {
            if(err) console.error("Error seeding admin:", err.message);
            else console.log("Admin user seeded/reset successfully: admin / password123");
        }
    );

    // Ensure Default Project Exists
    db.get("SELECT count(*) as count FROM projects", (err, row) => {
        if (!err && row && row.count === 0) {
            console.log("Seeding default Project...");
            db.run("INSERT INTO projects (id, name, description, is_active, created_at) VALUES (?, ?, ?, ?, ?)",
                ['PROJ-001', 'application Phase 1 (City Center)', 'Default Production Project', 1, new Date().toISOString()]);
        }
    });
};

// --- File Storage Config ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const appId = req.body.appId || 'UNKNOWN';
        const docType = req.body.docType ? req.body.docType.replace(/[^a-zA-Z0-9]/g, '_') : 'DOC';
        const ext = path.extname(file.originalname);
        const timestamp = Date.now();
        const cleanFileName = `${appId}_${docType}_${timestamp}${ext}`;
        cb(null, cleanFileName);
    }
});
const upload = multer({ storage });

// --- IP Ban Middleware ---
const checkIpBan = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    db.get("SELECT * FROM ip_bans WHERE ip_address = ?", [ip], (err, row) => {
        if (row && row.lockout_until) {
            if (new Date(row.lockout_until) > new Date()) {
                console.warn(`Blocked attempt from banned IP: ${ip}`);
                return res.status(403).json({ error: "Access Denied: IP is locked. Restart server to reset." });
            }
        }
        next();
    });
};

const recordFailedLogin = (ip) => {
    db.get("SELECT * FROM ip_bans WHERE ip_address = ?", [ip], (err, row) => {
        const now = new Date();
        if (row) {
            let attempts = row.failed_attempts + 1;
            let lockout = null;
            if (attempts >= MAX_ATTEMPTS) {
                const lockTime = new Date(now.getTime() + (LOCKOUT_DURATION_HOURS * 60 * 60 * 1000));
                lockout = lockTime.toISOString();
                console.error(`IP LOCKED: ${ip} due to too many failures.`);
            }
            db.run("UPDATE ip_bans SET failed_attempts = ?, last_attempt = ?, lockout_until = ? WHERE ip_address = ?", 
                [attempts, now.toISOString(), lockout, ip]);
        } else {
            db.run("INSERT INTO ip_bans (ip_address, failed_attempts, last_attempt) VALUES (?, 1, ?)", [ip, now.toISOString()]);
        }
    });
};

const clearFailedLogin = (ip) => {
    db.run("DELETE FROM ip_bans WHERE ip_address = ?", [ip]);
};

// --- Routes ---

app.post('/api/auth/login', checkIpBan, (req, res) => {
    const { username, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err || !user) {
            recordFailedLogin(ip);
            return res.status(401).json({ error: "Invalid credentials" });
        }
        
        // For development, we might have forced a reset, so user.password_hash should be valid bcrypt hash
        const validPassword = bcrypt.compareSync(password, user.password_hash);
        if (!validPassword) {
            recordFailedLogin(ip);
            return res.status(401).json({ error: "Invalid credentials" });
        }
        clearFailedLogin(ip);
        const token = jwt.sign({ username: user.username, role: user.role, fullName: user.full_name }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ token, user: { username: user.username, role: user.role, fullName: user.full_name } });
    });
});

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

app.get('/api/admin/banned-ips', authenticateToken, (req, res) => {
    if (req.user.role !== 'ADMIN') return res.sendStatus(403);
    db.all("SELECT * FROM ip_bans WHERE lockout_until IS NOT NULL", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/admin/unlock-ip', authenticateToken, (req, res) => {
    if (req.user.role !== 'ADMIN') return res.sendStatus(403);
    const { ip } = req.body;
    db.run("DELETE FROM ip_bans WHERE ip_address = ?", [ip], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: `IP ${ip} unlocked successfully.` });
    });
});

app.get('/api/projects', authenticateToken, (req, res) => {
    db.all("SELECT * FROM projects", [], (err, rows) => {
        if(err) return res.status(500).json({error: err.message});
        res.json(rows.map(r => ({...r, isActive: !!r.is_active})));
    });
});

app.get('/api/applications', authenticateToken, (req, res) => {
    db.all("SELECT * FROM applications", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const promises = rows.map(async (app) => {
            app.isSpecialCategory = !!app.is_special_category;
            app.linkedAppIds = JSON.parse(app.linked_app_ids || '[]');
            app.duplicateFlags = app.duplicate_flags;
            app.projectId = app.project_id;
            app.entryTimestamp = app.entry_timestamp;
            app.applicantName = app.applicant_name;
            app.phonePrimary = app.phone_primary;
            app.physicalReceiptTimestamp = app.physical_receipt_timestamp;
            app.operatorId = app.operator_id;
            app.fatherOrSpouseName = app.father_spouse_name;
            app.addressLine1 = app.address_line1;
            app.addressLine2 = app.address_line2;
            app.lifecycleStage = app.lifecycle_stage;
            
            app.documents = await new Promise(resolve => {
                db.all("SELECT doc_type as type, version, uploaded_at as uploadedAt, file_name as fileName, file_path as url, is_available as isAvailable FROM documents WHERE app_id = ?", [app.id], (e, docs) => {
                    const grouped = {};
                    (docs || []).forEach(d => {
                        if(!grouped[d.type]) grouped[d.type] = { type: d.type, isAvailable: !!d.isAvailable, versions: [] };
                        grouped[d.type].versions.push(d);
                    });
                    resolve(Object.values(grouped));
                });
            });
            app.familyMembers = await new Promise(resolve => {
                db.all("SELECT * FROM family_members WHERE app_id = ?", [app.id], (e, fam) => resolve(fam || []));
            });
            app.auditLog = await new Promise(resolve => {
                db.all("SELECT timestamp, user_id as userId, action, details FROM audit_logs WHERE app_id = ?", [app.id], (e, logs) => resolve(logs || []));
            });
            return app;
        });
        Promise.all(promises).then(data => res.json(data));
    });
});

app.get('/api/applications/:id/exists', authenticateToken, (req, res) => {
    db.get("SELECT id FROM applications WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ exists: !!row });
    });
});

app.post('/api/applications', authenticateToken, (req, res) => {
    const app = req.body;
    const stmt = db.prepare(`INSERT OR REPLACE INTO applications (
        id, project_id, lifecycle_stage, entry_timestamp, physical_receipt_timestamp, operator_id,
        applicant_name, father_spouse_name, dob, gender, category, is_special_category,
        aadhaar, phone_primary, phone_alt, pan, bank_account, ifsc, income,
        address_line1, address_line2, city, state, pincode, status, lottery_status, notes, duplicate_flags
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    stmt.run([
        app.id, app.projectId, app.lifecycleStage, new Date().toISOString(), app.physicalReceiptTimestamp, req.user.username,
        app.applicantName, app.fatherOrSpouseName, app.dob, app.gender, app.category, app.isSpecialCategory ? 1 : 0,
        app.aadhaar, app.phonePrimary, app.phoneAlt, app.pan, app.bankAccount, app.ifsc, app.income,
        app.addressLine1, app.addressLine2, app.city, app.state, app.pincode, app.status, app.lotteryStatus, app.notes, app.duplicateFlags
    ], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        db.run("DELETE FROM family_members WHERE app_id = ?", [app.id], () => {
            if(app.familyMembers && app.familyMembers.length > 0) {
                const famStmt = db.prepare("INSERT INTO family_members (id, app_id, name, relation, aadhaar, age) VALUES (?, ?, ?, ?, ?, ?)");
                app.familyMembers.forEach(fam => famStmt.run([fam.id, app.id, fam.name, fam.relation, fam.aadhaar, fam.age]));
                famStmt.finalize();
            }
        });
        db.run("INSERT INTO audit_logs (app_id, user_id, action, details) VALUES (?, ?, ?, ?)", 
            [app.id, req.user.username, 'SAVE', 'Application record saved/updated']);
        res.json({ message: "Saved successfully" });
    });
});

app.post('/api/documents/upload', authenticateToken, upload.single('file'), (req, res) => {
    const { appId, docType } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    db.get("SELECT MAX(version) as v FROM documents WHERE app_id = ? AND doc_type = ?", [appId, docType], (err, row) => {
        const nextVersion = (row && row.v) ? row.v + 1 : 1;
        // In Production, this URL should be the public URL. 
        // For Nginx proxy setup (location /api proxy_pass 5000), accessing /uploads needs its own location block or simple relative path.
        // We'll use absolute path relative to root for the API.
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
        
        db.run("INSERT INTO documents (app_id, doc_type, file_path, file_name, version, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)",
            [appId, docType, fileUrl, file.filename, nextVersion, req.user.username],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });
                db.run("INSERT INTO audit_logs (app_id, user_id, action, details) VALUES (?, ?, ?, ?)", 
                    [appId, req.user.username, 'UPLOAD', `Uploaded ${docType} (v${nextVersion})`]);
                res.json({ url: fileUrl, version: nextVersion, fileName: file.filename, uploadedAt: new Date().toISOString() });
            }
        );
    });
});

app.listen(PORT, () => {
    console.log(`application Production Server running on port ${PORT}`);
});