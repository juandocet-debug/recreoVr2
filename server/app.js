const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// ========== CONFIGURACIÓN DE SEGURIDAD ==========
const TOKEN_EXPIRY_HOURS = 8;
const SALT_ROUNDS = 10;

// Almacén de sesiones activas con expiración
const sessions = new Map();

// Generar token seguro
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Crear sesión con expiración
function createSession(userId, userData) {
    const token = generateToken();

    const expiresAt = Date.now() + (TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    sessions.set(token, {
        ...userData,
        expiresAt
    });

    return token;
}

// Limpiar sesiones expiradas cada hora
setInterval(() => {
    const now = Date.now();
    for (const [token, session] of sessions.entries()) {
        if (session.expiresAt < now) {
            sessions.delete(token);
        }
    }
}, 60 * 60 * 1000);
// ========== VALIDACIÓN DE ENTRADA ==========

// Sanitizar entrada - eliminar caracteres peligrosos
function sanitizeInput(input) {
    if (input === null || input === undefined) return '';
    if (typeof input !== 'string') return input;
    return input
        .replace(/[<>]/g, '') // Prevenir XSS
        .replace(/'/g, "''") // Escapar comillas simples para SQL
        .trim();
}

// Validar campos requeridos
function validateRequired(fields, body) {
    const missing = [];
    for (const field of fields) {
        if (!body[field] || body[field].toString().trim() === '') {
            missing.push(field);
        }
    }
    return missing;
}

// Validadores por tipo
const validators = {
    email: (value) => {
        if (!value) return true; // Opcional
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(value) ? null : 'Email inválido';
    },

    phone: (value) => {
        if (!value) return true;
        const regex = /^[0-9\s\-\+\(\)]{7,20}$/;
        return regex.test(value) ? null : 'Teléfono inválido';
    },

    identification: (value) => {
        if (!value) return 'Identificación requerida';
        const regex = /^[a-zA-Z0-9]{5,20}$/;
        return regex.test(value) ? null : 'Identificación debe tener 5-20 caracteres alfanuméricos';
    },

    date: (value) => {
        if (!value) return true;
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        return regex.test(value) ? null : 'Fecha debe ser formato YYYY-MM-DD';
    },

    time: (value) => {
        if (!value) return true;
        const regex = /^\d{2}:\d{2}$/;
        return regex.test(value) ? null : 'Hora debe ser formato HH:MM';
    },

    role: (value) => {
        const validRoles = ['administrador', 'coordinador', 'profesor', 'estudiante'];
        return validRoles.includes(value) ? null : 'Rol inválido';
    },

    text: (value, min = 0, max = 1000) => {
        if (!value && min === 0) return null;
        if (!value) return `Campo requerido`;
        if (value.length < min) return `Mínimo ${min} caracteres`;
        if (value.length > max) return `Máximo ${max} caracteres`;
        return null;
    }
};

// Función para validar un objeto completo
function validateFields(body, rules) {
    const errors = {};

    for (const [field, rule] of Object.entries(rules)) {
        const value = body[field];
        let error = null;

        if (typeof rule === 'function') {
            error = rule(value);
        } else if (typeof rule === 'string') {
            // Tipo de validador predefinido
            error = validators[rule] ? validators[rule](value) : null;
        } else if (typeof rule === 'object') {
            // Regla con opciones
            if (rule.required && (!value || value.toString().trim() === '')) {
                error = `${field} es requerido`;
            } else if (rule.type && validators[rule.type]) {
                error = validators[rule.type](value, rule.min, rule.max);
            }
        }

        if (error) {
            errors[field] = error;
        }
    }

    return Object.keys(errors).length > 0 ? errors : null;
}

// Middleware de validación
function validate(rules) {
    return (req, res, next) => {
        const errors = validateFields(req.body, rules);
        if (errors) {
            return res.status(400).json({
                error: 'Errores de validación',
                details: errors
            });
        }
        next();
    };
}

// ========== HASH DE CONTRASEÑAS ==========
async function hashPassword(password) {
    return await bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '..')));

// MIDDLEWARE DE AUTENTICACIÓN
function authMiddleware(req, res, next) {
    const token = req.headers['authorization']?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const session = sessions.get(token);
    if (!session) {
        return res.status(401).json({ error: 'Sesión inválida o expirada' });
    }

    // Verificar si el token ha expirado
    if (session.expiresAt && session.expiresAt < Date.now()) {
        sessions.delete(token);
        return res.status(401).json({ error: 'Sesión expirada, inicia sesión nuevamente' });
    }

    // Agregar usuario a la request
    req.user = session;
    next();
}

// MIDDLEWARE DE AUTORIZACIÓN POR ROL
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'No tienes permisos para esta acción' });
        }

        next();
    };
}

// Login Endpoint - Genera token con expiración
app.post('/api/login', async (req, res) => {
    const { username, password, role } = req.body;

    // Validar entrada
    if (!username || !password) {
        return res.status(400).json({ message: 'Usuario y contraseña requeridos' });
    }

    const sql = "SELECT * FROM users WHERE username = ?";
    db.get(sql, [sanitizeInput(username)], async (err, row) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }

        if (!row) {
            return res.status(401).json({ "message": "Credenciales inválidas" });
        }

        // Verificar contraseña (soporta hash bcrypt o texto plano para migración)
        let passwordValid = false;
        if (row.password.startsWith('$2')) {
            // Contraseña hasheada con bcrypt
            passwordValid = await verifyPassword(password, row.password);
        } else {
            // Contraseña en texto plano (migración pendiente)
            passwordValid = (row.password === password);

            // AUTO-MIGRAR: hashear la contraseña si aún está en texto plano
            if (passwordValid) {
                const hashedPassword = await hashPassword(password);
                db.run("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, row.id]);
                console.log(`Contraseña migrada a hash para usuario: ${row.username}`);
            }
        }

        if (!passwordValid) {
            return res.status(401).json({ "message": "Credenciales inválidas" });
        }

        if (role && row.role !== role) {
            return res.status(401).json({ "message": "Rol incorrecto para este usuario" });
        }

        // Crear sesión con expiración
        const token = createSession(row.id, {
            id: row.id,
            username: row.username,
            role: row.role,
            name: row.name,
            photo: row.photo,
            email: row.email,
            phone: row.phone,
            identification: row.identification
        });

        res.json({
            "message": "success",
            "data": row,
            "token": token
        });
    });
});

// Logout - Invalida token
app.post('/api/logout', (req, res) => {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (token) {
        sessions.delete(token);
    }
    res.json({ message: 'Sesión cerrada' });
});

// Verificar sesión
app.get('/api/verify-session', authMiddleware, (req, res) => {
    res.json({ valid: true, user: req.user });
});

// Change Password Endpoint
app.post('/api/change-password', async (req, res) => {
    const { userId, newPassword } = req.body;

    // Validar entrada
    if (!userId || !newPassword) {
        return res.status(400).json({ error: 'UserId y newPassword son requeridos' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Hashear la nueva contraseña
    const hashedPassword = await hashPassword(newPassword);

    const sql = "UPDATE users SET password = ?, mustChangePassword = 0 WHERE id = ?";
    db.run(sql, [hashedPassword, userId], function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "success", "changes": this.changes });
    });
});

// PUT Update own profile (protegido - usuario actual puede actualizar su perfil)
app.put('/api/profile', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const { name, email, phone, photo, newPassword } = req.body;

    // Construir query dinámicamente
    let updates = [];
    let params = [];

    if (name) {
        updates.push("name = ?");
        params.push(sanitizeInput(name));
    }
    if (email) {
        updates.push("email = ?");
        params.push(sanitizeInput(email));
    }
    if (phone) {
        updates.push("phone = ?");
        params.push(sanitizeInput(phone));
    }
    if (photo !== undefined) {
        updates.push("photo = ?");
        params.push(photo); // Base64 o URL
    }

    // Si hay nueva contraseña, hashearla
    if (newPassword && newPassword.length >= 6) {
        const hashedPassword = await hashPassword(newPassword);
        updates.push("password = ?");
        params.push(hashedPassword);
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: "No hay datos para actualizar" });
    }

    params.push(userId);
    const sql = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;

    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }

        // Obtener datos actualizados
        db.get("SELECT id, name, email, phone, photo, role, identification FROM users WHERE id = ?", [userId], (err, row) => {
            if (err) {
                res.status(400).json({ "error": err.message });
                return;
            }
            res.json({ "message": "success", "data": row });
        });
    });
});

// === Professors Endpoints ===

// GET All Professors (protegido - solo admin/coordinador) - incluye todos los datos
app.get('/api/professors', authMiddleware, requireRole('administrador', 'coordinador'), (req, res) => {
    const sql = "SELECT * FROM users WHERE role IN ('professor', 'profesor', 'coordinador')";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

// GET Users for autocomplete (protegido - todos pueden ver, pero datos limitados)
// Profesores y coordinadores ven cédula, estudiantes solo ven nombre
app.get('/api/users-autocomplete', authMiddleware, (req, res) => {
    const userRole = req.user.role;
    const canSeeIdentification = ['administrador', 'coordinador', 'profesor'].includes(userRole);

    const sql = "SELECT id, name, role, identification, photo FROM users";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }

        // Filtrar datos según el rol del usuario
        const data = rows.map(u => ({
            id: u.id,
            name: u.name,
            role: u.role,
            photo: u.photo, // Todos pueden ver la foto
            identification: canSeeIdentification ? u.identification : undefined
        }));

        res.json({
            "message": "success",
            "data": data
        });
    });
});

// POST Create Professor (protegido - solo admin/coordinador)
// Validación mínima - solo campos requeridos
const professorValidation = {
    name: { required: true, type: 'text', min: 2, max: 100 },
    identification: { required: true, type: 'text', min: 3, max: 20 }
    // email, phone, role son opcionales
};

app.post('/api/professors',
    authMiddleware,
    requireRole('administrador', 'coordinador'),
    validate(professorValidation),
    async (req, res) => {
        const { id, name, email, photo, specialty, cv, profile, role, identification, phone, gender, sex } = req.body;

        // Default credentials: username = identification, password = identification (hasheado)
        const username = sanitizeInput(identification || id);
        const hashedPassword = await hashPassword(identification || id);

        const sql = "INSERT INTO users (username, password, role, name, email, photo, specialty, cv, profile, identification, phone, gender, sex, mustChangePassword) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)";
        const params = [
            username,
            hashedPassword,
            sanitizeInput(role),
            sanitizeInput(name),
            sanitizeInput(email),
            photo,
            sanitizeInput(specialty),
            cv,
            profile,
            sanitizeInput(identification),
            sanitizeInput(phone),
            gender,
            sex
        ];

        db.run(sql, params, function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Ya existe un usuario con esa identificación' });
                }
                res.status(400).json({ "error": err.message });
                return;
            }

            res.json({
                "message": "success",
                "data": req.body,
                "id": this.lastID,
                "credentials": {
                    "username": username,
                    "password": identification || id
                }
            });
        });
    }
);

// PUT Update Professor (protegido - solo admin/coordinador)
app.put('/api/professors/:id', authMiddleware, requireRole('administrador', 'coordinador'), (req, res) => {
    const { name, email, photo, specialty, cv, profile, role, identification, phone, gender, sex } = req.body;
    const sql = `UPDATE users SET 
                 name = COALESCE(?, name), 
                 email = COALESCE(?, email), 
                 photo = COALESCE(?, photo), 
                 specialty = COALESCE(?, specialty), 
                 cv = COALESCE(?, cv), 
                 profile = COALESCE(?, profile), 
                 role = COALESCE(?, role),
                 identification = COALESCE(?, identification),
                 phone = COALESCE(?, phone),
                 gender = COALESCE(?, gender),
                 sex = COALESCE(?, sex)
                 WHERE id = ? AND role IN ('professor', 'profesor', 'coordinador')`;
    const params = [name, email, photo, specialty, cv, profile, role, identification, phone, gender, sex, req.params.id];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": req.body,
            "changes": this.changes
        });
    });
});

// DELETE Professor (protegido - solo admin/coordinador)
app.delete('/api/professors/:id', authMiddleware, requireRole('administrador', 'coordinador'), (req, res) => {
    const sql = "DELETE FROM users WHERE id = ? AND role IN ('professor', 'profesor', 'coordinador')";
    db.run(sql, [req.params.id], function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "deleted", changes: this.changes });
    });
});

// PUT Update Professor Signature Image
app.put('/api/professors/:id/signature', (req, res) => {
    const { signatureImage } = req.body;
    const sql = "UPDATE professors SET signatureImage = ? WHERE id = ?";
    db.run(sql, [signatureImage, req.params.id], function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "success", "changes": this.changes });
    });
});

// === Actas Endpoints ===

// GET All Actas (with optional filtering by user)
app.get('/api/actas', (req, res) => {
    const { userId, userRole } = req.query;

    const sql = "SELECT * FROM actas";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }

        // Parse JSON fields
        let data = rows.map(row => ({
            ...row,
            content: JSON.parse(row.content || '{}'),
            commitments: JSON.parse(row.commitments || '[]'),
            signatures: JSON.parse(row.signatures || '{}')
        }));

        // Filter by user if not admin/coordinator
        if (userId && userRole && userRole !== 'administrador' && userRole !== 'coordinador') {
            const username = req.query.username; // Username para comparar con createdBy

            data = data.filter(acta => {
                // El usuario creó el acta (comparando con username)
                if (username && acta.createdBy === username) return true;

                const attendees = acta.content.attendees || [];
                const absent = acta.content.absent || [];
                const guests = acta.content.guests || [];

                // Check if user name is in any of the lists
                const allRelated = [...attendees, ...absent, ...guests];
                return allRelated.some(person =>
                    person.name && person.name.toLowerCase().includes(userId.toLowerCase())
                );
            });
        }

        res.json({ "message": "success", "data": data });
    });
});

// POST Create Acta (protegido - cualquier usuario autenticado)
const actaValidation = {
    type: { required: true, type: 'text', min: 1, max: 50 },
    date: 'date',
    startTime: 'time',
    endTime: 'time'
};

app.post('/api/actas', authMiddleware, validate(actaValidation), (req, res) => {
    const { type, category, date, startTime, endTime, location, dependencies, content, commitments, nextMeeting, groupId, signatures, createdBy } = req.body;

    const sql = "INSERT INTO actas (type, category, date, startTime, endTime, location, dependencies, content, commitments, nextMeeting, groupId, signatures, createdBy) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)";
    const params = [
        sanitizeInput(type),
        sanitizeInput(category),
        date,
        startTime,
        endTime,
        sanitizeInput(location),
        sanitizeInput(dependencies),
        JSON.stringify(content || {}),
        JSON.stringify(commitments || []),
        nextMeeting,
        groupId,
        JSON.stringify(signatures || {}),
        sanitizeInput(createdBy)
    ];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": req.body,
            "id": this.lastID
        });
    });
});

// PUT Update Acta (protegido - requiere verificación de creador o admin)
app.put('/api/actas/:id', authMiddleware, (req, res) => {
    const { type, category, date, startTime, endTime, location, dependencies, content, commitments, nextMeeting, groupId, signatures } = req.body;
    const sql = `UPDATE actas SET 
                 type = COALESCE(?, type), 
                 category = COALESCE(?, category), 
                 date = COALESCE(?, date), 
                 startTime = COALESCE(?, startTime), 
                 endTime = COALESCE(?, endTime), 
                 location = COALESCE(?, location), 
                 dependencies = COALESCE(?, dependencies), 
                 content = COALESCE(?, content),
                 commitments = COALESCE(?, commitments),
                 nextMeeting = COALESCE(?, nextMeeting),
                 groupId = COALESCE(?, groupId),
                 signatures = COALESCE(?, signatures)
                 WHERE id = ?`;

    const params = [
        type,
        category,
        date,
        startTime,
        endTime,
        location,
        dependencies,
        content ? JSON.stringify(content) : null,
        commitments ? JSON.stringify(commitments) : null,
        nextMeeting,
        groupId,
        signatures ? JSON.stringify(signatures) : null,
        req.params.id
    ];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "success", "changes": this.changes });
    });
});

// DELETE Acta (protegido - solo admin/coordinador o creador)
app.delete('/api/actas/:id', authMiddleware, (req, res) => {
    // Primero verificar si el usuario puede eliminar
    db.get('SELECT createdBy FROM actas WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(400).json({ error: err.message });

        const isAdmin = ['administrador', 'coordinador'].includes(req.user.role);
        const isCreator = row && row.createdBy === req.user.username;

        if (!isAdmin && !isCreator) {
            return res.status(403).json({ error: 'No tienes permisos para eliminar esta acta' });
        }

        const sql = "DELETE FROM actas WHERE id = ?";
        db.run(sql, req.params.id, function (err) {
            if (err) {
                res.status(400).json({ "error": err.message });
                return;
            }
            res.json({ "message": "deleted", changes: this.changes });
        });
    });
});

// === Document Categories Endpoints ===

// GET All Categories
app.get('/api/document-categories', (req, res) => {
    const sql = "SELECT * FROM document_categories ORDER BY name ASC";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

// POST Create Category
app.post('/api/document-categories', (req, res) => {
    const { name, description } = req.body;

    if (!name) {
        res.status(400).json({ "error": "Name is required" });
        return;
    }

    const sql = "INSERT INTO document_categories (name, description) VALUES (?, ?)";
    db.run(sql, [name, description], function (err) {
        if (err) {
            if (err.message.includes("UNIQUE constraint failed")) {
                res.status(400).json({ "error": "Ya existe una categoría con ese nombre" });
            } else {
                res.status(400).json({ "error": err.message });
            }
            return;
        }
        res.json({
            "message": "success",
            "data": { id: this.lastID, name, description }
        });
    });
});

// PUT Update Category
app.put('/api/document-categories/:id', (req, res) => {
    const { name, description } = req.body;
    const sql = `UPDATE document_categories SET 
                 name = COALESCE(?, name), 
                 description = COALESCE(?, description)
                 WHERE id = ?`;

    db.run(sql, [name, description, req.params.id], function (err) {
        if (err) {
            if (err.message.includes("UNIQUE constraint failed")) {
                res.status(400).json({ "error": "Ya existe una categoría con ese nombre" });
            } else {
                res.status(400).json({ "error": err.message });
            }
            return;
        }
        res.json({
            "message": "success",
            "changes": this.changes
        });
    });
});

// DELETE Category
// IMPORTANTE: No borra las actas asociadas, solo la categoría
app.delete('/api/document-categories/:id', (req, res) => {
    const categoryId = req.params.id;

    // Primero, verificar cuántas actas usan esta categoría
    const checkSql = "SELECT name FROM document_categories WHERE id = ?";
    db.get(checkSql, [categoryId], (err, categoryRow) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }

        if (!categoryRow) {
            res.status(404).json({ "error": "Categoría no encontrada" });
            return;
        }

        // Contar actas con esta categoría
        const countSql = "SELECT COUNT(*) as count FROM actas WHERE category = ?";
        db.get(countSql, [categoryRow.name], (err, countRow) => {
            if (err) {
                res.status(400).json({ "error": err.message });
                return;
            }

            // Eliminar la categoría (las actas conservarán el nombre de la categoría que tenían)
            const deleteSql = "DELETE FROM document_categories WHERE id = ?";
            db.run(deleteSql, categoryId, function (err) {
                if (err) {
                    res.status(400).json({ "error": err.message });
                    return;
                }
                res.json({
                    "message": "deleted",
                    "changes": this.changes,
                    "actasAffected": countRow.count,
                    "note": `${countRow.count} acta(s) conservarán el nombre de categoría "${categoryRow.name}"`
                });
            });
        });
    });
});

// === Faculties Endpoints ===

app.get('/api/faculties', (req, res) => {
    const sql = "SELECT * FROM faculties ORDER BY name ASC";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "success", "data": rows });
    });
});

app.post('/api/faculties', (req, res) => {
    const { name, description } = req.body;
    if (!name) {
        res.status(400).json({ "error": "Name is required" });
        return;
    }
    const sql = "INSERT INTO faculties (name, description) VALUES (?, ?)";
    db.run(sql, [name, description], function (err) {
        if (err) {
            if (err.message.includes("UNIQUE")) {
                res.status(400).json({ "error": "Ya existe una facultad con ese nombre" });
            } else {
                res.status(400).json({ "error": err.message });
            }
            return;
        }
        res.json({ "message": "success", "data": { id: this.lastID, name, description } });
    });
});

app.put('/api/faculties/:id', (req, res) => {
    const { name, description } = req.body;
    const sql = `UPDATE faculties SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE id = ?`;
    db.run(sql, [name, description, req.params.id], function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "success", "changes": this.changes });
    });
});

app.delete('/api/faculties/:id', (req, res) => {
    const sql = "DELETE FROM faculties WHERE id = ?";
    db.run(sql, req.params.id, function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "deleted", "changes": this.changes, "note": "Los grupos conservan el nombre de facultad" });
    });
});

// === Programs Endpoints ===

app.get('/api/programs', (req, res) => {
    const sql = `SELECT p.*, f.name as faculty_name 
                 FROM programs p 
                 LEFT JOIN faculties f ON p.faculty_id = f.id 
                 ORDER BY p.name ASC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "success", "data": rows });
    });
});

app.post('/api/programs', (req, res) => {
    const { code, name, faculty_id, description } = req.body;
    if (!code || !name || !faculty_id) {
        res.status(400).json({ "error": "Code, name y faculty_id son requeridos" });
        return;
    }
    const sql = "INSERT INTO programs (code, name, faculty_id, description) VALUES (?, ?, ?, ?)";
    db.run(sql, [code, name, faculty_id, description], function (err) {
        if (err) {
            if (err.message.includes("UNIQUE")) {
                res.status(400).json({ "error": "Ya existe un programa con ese código" });
            } else {
                res.status(400).json({ "error": err.message });
            }
            return;
        }
        res.json({ "message": "success", "data": { id: this.lastID, code, name, faculty_id, description } });
    });
});

app.put('/api/programs/:id', (req, res) => {
    const { code, name, faculty_id, description } = req.body;
    const sql = `UPDATE programs SET 
                 code = COALESCE(?, code), 
                 name = COALESCE(?, name),
                 faculty_id = COALESCE(?, faculty_id),
                 description = COALESCE(?, description)
                 WHERE id = ?`;
    db.run(sql, [code, name, faculty_id, description, req.params.id], function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "success", "changes": this.changes });
    });
});

app.delete('/api/programs/:id', (req, res) => {
    const sql = "DELETE FROM programs WHERE id = ?";
    db.run(sql, req.params.id, function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "deleted", "changes": this.changes, "note": "Los grupos conservan el nombre del programa" });
    });
});

// === Groups Endpoints ===

app.get('/api/groups', (req, res) => {
    const sql = "SELECT * FROM groups ORDER BY created_at DESC";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "success", "data": rows });
    });
});

app.post('/api/groups', (req, res) => {
    const { id, name, faculty_name, program_name, year, period, advisor_id, advisor_name, advisor_identification, description } = req.body;

    if (!id || !name) {
        res.status(400).json({ "error": "ID y nombre son requeridos" });
        return;
    }

    const sql = `INSERT INTO groups (id, name, faculty_name, program_name, year, period, advisor_id, advisor_name, advisor_identification, description) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [id, name, faculty_name, program_name, year, period, advisor_id, advisor_name, advisor_identification, description], function (err) {
        if (err) {
            if (err.message.includes("UNIQUE")) {
                res.status(400).json({ "error": "Ya existe un grupo con ese código" });
            } else {
                res.status(400).json({ "error": err.message });
            }
            return;
        }
        res.json({ "message": "success", "data": { id: this.lastID } });
    });
});

app.put('/api/groups/:id', (req, res) => {
    const { name, faculty_name, program_name, year, period, advisor_id, advisor_name, advisor_identification, description, documents, advisors } = req.body;

    const sql = `UPDATE groups SET 
                 name = COALESCE(?, name),
                 faculty_name = COALESCE(?, faculty_name),
                 program_name = COALESCE(?, program_name),
                 year = COALESCE(?, year),
                 period = COALESCE(?, period),
                 advisor_id = COALESCE(?, advisor_id),
                 advisor_name = COALESCE(?, advisor_name),
                 advisor_identification = COALESCE(?, advisor_identification),
                 description = COALESCE(?, description),
                 documents = COALESCE(?, documents),
                 advisors = COALESCE(?, advisors)
                 WHERE id = ?`;

    db.run(sql, [name, faculty_name, program_name, year, period, advisor_id, advisor_name, advisor_identification, description, documents, advisors, req.params.id], function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "success", "changes": this.changes });
    });
});

app.delete('/api/groups/:id', (req, res) => {
    const sql = "DELETE FROM groups WHERE id = ?";
    db.run(sql, req.params.id, function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "deleted", "changes": this.changes });
    });
});

// ============ STUDENTS ENDPOINTS ============

// Get students by group
app.get('/api/groups/:groupId/students', (req, res) => {
    const sql = "SELECT id, username, name, role, group_id, relatedId FROM users WHERE role = 'student' AND group_id = ?";

    db.all(sql, [req.params.groupId], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "data": rows });
    });
});

// DEBUG: Ver todos los usuarios (temporal)
app.get('/api/users/all', (req, res) => {
    const sql = "SELECT id, username, name, role, group_id FROM users";

    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "data": rows });
    });
});

// Get all students without group (available to assign)
app.get('/api/students/available', (req, res) => {
    const sql = "SELECT id, username, name, role FROM users WHERE role = 'student' AND (group_id IS NULL OR group_id = '')";

    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "data": rows });
    });
});

// DEBUG: Ver usuario con password (temporal)
app.get('/api/users/debug/:username', (req, res) => {
    const sql = "SELECT id, username, password, name, role FROM users WHERE username = ?";
    db.get(sql, [req.params.username], (err, row) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "data": row });
    });
});

// Reset password de un usuario
app.put('/api/users/:id/reset-password', (req, res) => {
    const { newPassword } = req.body;
    const sql = "UPDATE users SET password = ?, mustChangePassword = 1 WHERE id = ?";
    db.run(sql, [newPassword, req.params.id], function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "Password reset", "changes": this.changes });
    });
});


// Assign student to group
app.put('/api/students/:studentId/assign-group', (req, res) => {
    const { group_id } = req.body;

    const sql = "UPDATE users SET group_id = ? WHERE id = ? AND role = 'student'";

    db.run(sql, [group_id, req.params.studentId], function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "success", "changes": this.changes });
    });
});

// Remove student from group
app.put('/api/students/:studentId/remove-from-group', (req, res) => {
    const sql = "UPDATE users SET group_id = NULL WHERE id = ? AND role = 'student'";

    db.run(sql, [req.params.studentId], function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "success", "changes": this.changes });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
