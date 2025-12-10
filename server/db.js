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
                // Schema Migration for Users
                const columnsToAdd = [
                    "ALTER TABLE users ADD COLUMN mustChangePassword INTEGER DEFAULT 1",
                    "ALTER TABLE users ADD COLUMN relatedId TEXT"
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

        // Professors Table
        db.run(`CREATE TABLE IF NOT EXISTS professors (
            id TEXT PRIMARY KEY,
            name TEXT,
            email TEXT,
            photo TEXT,
            specialty TEXT,
            cv TEXT,
            profile TEXT,
            role TEXT,
            identification TEXT,
            phone TEXT,
            gender TEXT,
            sex TEXT
        )`, (err) => {
            if (err) {
                console.error("Error creating table professors:", err);
            } else {
                // Attempt to add new columns if they don't exist (Schema Migration)
                const columnsToAdd = [
                    "ALTER TABLE professors ADD COLUMN identification TEXT",
                    "ALTER TABLE professors ADD COLUMN phone TEXT",
                    "ALTER TABLE professors ADD COLUMN gender TEXT",
                    "ALTER TABLE professors ADD COLUMN sex TEXT",
                    "ALTER TABLE professors ADD COLUMN signatureImage TEXT"
                ];

                columnsToAdd.forEach(sql => {
                    db.run(sql, (err) => {
                        // Ignore error if column already exists
                        if (err && !err.message.includes("duplicate column")) {
                            // console.error("Migration note:", err.message); 
                        }
                    });
                });

                // Seed initial professors
                db.get("SELECT count(*) as count FROM professors", (err, row) => {
                    if (row.count === 0) {
                        console.log("Seeding initial professors...");
                        const stmt = db.prepare("INSERT INTO professors (id, name, email, photo, specialty, cv, profile, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                        stmt.run('P-001', 'Dra. Ana Ruiz', 'ana@uni.edu', null, 'Educación/TIC', 'PhD en Pedagogía.', 'Investigadora senior.', 'profesor');
                        stmt.run('P-002', 'Ing. Carlos Pérez', 'carlos@uni.edu', null, '.NET/Agile', 'MSc. en Ing. de Software.', 'Líder innovación.', 'coordinador');
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
            signatures TEXT
        )`, (err) => {
            if (err) console.error("Error creating table actas:", err);
        });
    });
}

module.exports = db;
