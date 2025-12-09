const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Login Endpoint
app.post('/api/login', (req, res) => {
    const { username, password, role } = req.body;

    // Simple query - in production use hashing!
    const sql = "SELECT * FROM users WHERE username = ? AND password = ?";
    db.get(sql, [username, password], (err, row) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        if (row) {
            // Check role if provided (optional validation)
            if (role && row.role !== role) {
                res.status(401).json({ "message": "Rol incorrecto para este usuario" });
                return;
            }
            res.json({
                "message": "success",
                "data": row
            });
        } else {
            res.status(401).json({ "message": "Credenciales inválidas" });
        }
    });
});

// === Professors Endpoints ===

// GET All Professors
app.get('/api/professors', (req, res) => {
    const sql = "SELECT * FROM professors";
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

// POST Create Professor
app.post('/api/professors', (req, res) => {
    const { id, name, email, photo, specialty, cv, profile, role, identification, phone, gender, sex } = req.body;
    const sql = "INSERT INTO professors (id, name, email, photo, specialty, cv, profile, role, identification, phone, gender, sex) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)";
    const params = [id, name, email, photo, specialty, cv, profile, role, identification, phone, gender, sex];

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

// PUT Update Professor
app.put('/api/professors/:id', (req, res) => {
    const { name, email, photo, specialty, cv, profile, role, identification, phone, gender, sex } = req.body;
    const sql = `UPDATE professors SET 
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
                 WHERE id = ?`;
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

// DELETE Professor
app.delete('/api/professors/:id', (req, res) => {
    const sql = "DELETE FROM professors WHERE id = ?";
    db.run(sql, req.params.id, function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "deleted", changes: this.changes });
    });
});

// === Actas Endpoints ===

// GET All Actas
app.get('/api/actas', (req, res) => {
    const sql = "SELECT * FROM actas";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        // Parse JSON fields
        const data = rows.map(row => ({
            ...row,
            content: JSON.parse(row.content || '{}'),
            commitments: JSON.parse(row.commitments || '[]'),
            signatures: JSON.parse(row.signatures || '{}')
        }));
        res.json({ "message": "success", "data": data });
    });
});

// POST Create Acta
app.post('/api/actas', (req, res) => {
    const { type, category, date, startTime, endTime, location, dependencies, content, commitments, nextMeeting, groupId, signatures } = req.body;
    const sql = "INSERT INTO actas (type, category, date, startTime, endTime, location, dependencies, content, commitments, nextMeeting, groupId, signatures) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)";
    const params = [
        type,
        category,
        date,
        startTime,
        endTime,
        location,
        dependencies,
        JSON.stringify(content || {}),
        JSON.stringify(commitments || []),
        nextMeeting,
        groupId,
        JSON.stringify(signatures || {})
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

// PUT Update Acta
app.put('/api/actas/:id', (req, res) => {
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

// DELETE Acta
app.delete('/api/actas/:id', (req, res) => {
    const sql = "DELETE FROM actas WHERE id = ?";
    db.run(sql, req.params.id, function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "deleted", changes: this.changes });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
