const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'recreo.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + dbPath + ': ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Users Table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT,
            name TEXT,
            mustChangePassword INTEGER DEFAULT 1,
            relatedId TEXT
        )`, (err) => {
            if (err) {
                console.error("Error creating table users:", err);
            } else {
                // Schema Migration for Users - Agregar todos los campos de professors
                const columnsToAdd = [
                    "ALTER TABLE users ADD COLUMN mustChangePassword INTEGER DEFAULT 1",
                    "ALTER TABLE users ADD COLUMN relatedId TEXT",
                    "ALTER TABLE users ADD COLUMN group_id TEXT",
                    "ALTER TABLE users ADD COLUMN email TEXT",
                    "ALTER TABLE users ADD COLUMN photo TEXT",
                    "ALTER TABLE users ADD COLUMN specialty TEXT",
                    "ALTER TABLE users ADD COLUMN cv TEXT",
                    "ALTER TABLE users ADD COLUMN profile TEXT",
                    "ALTER TABLE users ADD COLUMN identification TEXT",
                    "ALTER TABLE users ADD COLUMN phone TEXT",
                    "ALTER TABLE users ADD COLUMN gender TEXT",
                    "ALTER TABLE users ADD COLUMN sex TEXT",
                    "ALTER TABLE users ADD COLUMN signatureImage TEXT"
                ];

                columnsToAdd.forEach(sql => {
                    db.run(sql, (err) => {
                        if (err && !err.message.includes("duplicate column")) {
                            // console.error("Migration note:", err.message);
                        }
                    });
                });

                // Seed initial users if empty
                db.get("SELECT count(*) as count FROM users", (err, row) => {
                    if (row.count === 0) {
                        console.log("Seeding initial users...");
                        const stmt = db.prepare("INSERT INTO users (username, password, role, name, mustChangePassword) VALUES (?, ?, ?, ?, ?)");
                        // Admin doesn't need to change password initially for dev convenience, or maybe yes? Let's set to 0 for admin default
                        stmt.run("admin", "admin123", "administrador", "Administrador", 0);
                        stmt.run("coord", "coord123", "coordinador", "Coordinador", 1);
                        stmt.run("prof", "prof123", "profesor", "Profesor", 1);
                        stmt.run("est", "est123", "estudiante", "Estudiante", 1);
                        stmt.finalize();
                    }
                });
            }
        });

        // Actas Table
        db.run(`CREATE TABLE IF NOT EXISTS actas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT,
            category TEXT,
            date TEXT,
            startTime TEXT,
            endTime TEXT,
            location TEXT,
            dependencies TEXT,
            content TEXT,
            commitments TEXT,
            nextMeeting TEXT,
            groupId TEXT,
            signatures TEXT,
            createdBy TEXT
        )`, (err) => {
            if (err) console.error("Error creating table actas:", err);
            // Migración: agregar columna createdBy si no existe
            db.run("ALTER TABLE actas ADD COLUMN createdBy TEXT", (err) => {
                // Ignorar error si ya existe
            });
        });

        // Document Categories Table
        db.run(`CREATE TABLE IF NOT EXISTS document_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error("Error creating table document_categories:", err);
            } else {
                // Seed initial categories
                db.get("SELECT count(*) as count FROM document_categories", (err, row) => {
                    if (row && row.count === 0) {
                        console.log("Seeding initial document categories...");
                        const stmt = db.prepare("INSERT INTO document_categories (name, description) VALUES (?, ?)");
                        stmt.run('Comité Curricular', 'Reuniones del comité curricular del programa');
                        stmt.run('Consejo de Facultad', 'Reuniones del consejo de facultad');
                        stmt.run('Reuniones de Grupo', 'Reuniones con cohortes o grupos de estudiantes');
                        stmt.finalize();
                    }
                });
            }
        });

        // Faculties Table
        db.run(`CREATE TABLE IF NOT EXISTS faculties (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error("Error creating table faculties:", err);
            } else {
                db.get("SELECT count(*) as count FROM faculties", (err, row) => {
                    if (row && row.count === 0) {
                        console.log("Seeding initial faculties...");
                        const stmt = db.prepare("INSERT INTO faculties (name, description) VALUES (?, ?)");
                        stmt.run('Educación', 'Facultad de Educación');
                        stmt.run('Ciencias y Tecnología', 'Facultad de Ciencia y Tecnología');
                        stmt.finalize();
                    }
                });
            }
        });

        // Programs Table
        db.run(`CREATE TABLE IF NOT EXISTS programs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            faculty_id INTEGER NOT NULL,
            description TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (faculty_id) REFERENCES faculties(id)
        )`, (err) => {
            if (err) {
                console.error("Error creating table programs:", err);
            } else {
                db.get("SELECT count(*) as count FROM programs", (err, row) => {
                    if (row && row.count === 0) {
                        console.log("Seeding initial programs...");
                        const stmt = db.prepare("INSERT INTO programs (code, name, faculty_id, description) VALUES (?, ?, ?, ?)");
                        stmt.run('090502', 'Lic. en Recreación', 1, 'Programa de Licenciatura en Recreación');
                        stmt.run('090501', 'Lic. en Educación Infantil', 1, 'Programa de Licenciatura en Educación Infantil');
                        stmt.finalize();
                    }
                });
            }
        });

        // Groups Table
        db.run(`CREATE TABLE IF NOT EXISTS groups (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            faculty_name TEXT,
            program_name TEXT,
            year INTEGER,
            period TEXT,
            advisor_id TEXT,
            advisor_name TEXT,
            advisor_identification TEXT,
            advisors TEXT,
            description TEXT,
            documents TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error("Error creating table groups:", err);
            } else {
                // Migración: agregar columnas si no existen
                db.run("ALTER TABLE groups ADD COLUMN documents TEXT", (err) => {
                    if (err && !err.message.includes("duplicate column")) {
                        // Ignorar
                    }
                });
                db.run("ALTER TABLE groups ADD COLUMN advisors TEXT", (err) => {
                    if (err && !err.message.includes("duplicate column")) {
                        // Ignorar
                    }
                });
            }
        });
    });
}

module.exports = db;
