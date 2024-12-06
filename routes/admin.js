const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();
const db = require("../db");

// JWT Secret Key
const JWT_SECRET = "ajkebfiuqvegbaueboginaobsugbaoishfoaiebg"; 

// Create Admin (Register)
router.post("/register", async (req, res) => {
    const { email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = "INSERT INTO Admin (Email, Password) VALUES (?, ?)";
        db.query(sql, [email, hashedPassword], (err, result) => {
            if (err) return res.status(500).send(err);
            res.status(201).json({ id: result.insertId, email });
        });
    } catch (err) {
        res.status(500).send("Error hashing password");
    }
});

// Admin Login
router.post("/login", (req, res) => {
    const { email, password } = req.body;
    const sql = "SELECT * FROM Admin WHERE Email = ?";
    console.log(email , password)
    db.query(sql, [email], async (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.length === 0) return res.status(401).send("Invalid email or password");

        const admin = results[0];
        const isPasswordValid = await bcrypt.compare(password, admin.Password);
        if (!isPasswordValid) return res.status(401).send("Invalid email or password");

        // Generate JWT
        const token = jwt.sign({ id: admin.ID_ADMIN, email: admin.Email }, JWT_SECRET, { expiresIn: "1h" });
        res.status(201).json({ token });
    });
});

// Middleware to Verify JWT
const verifyToken = (req, res, next) => {
    const token = req.headers["authorization"];
    if (!token) return res.status(403).send("Token is required");

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).send("Invalid token");
        req.user = decoded; // Attach decoded token data to the request
        next();
    });
};

// Read Admins (Protected Route)
router.get("/", verifyToken, (req, res) => {
    const sql = "SELECT * FROM Admin";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// Update Admin (Protected Route)
router.put("/:id", verifyToken, async (req, res) => {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = "UPDATE Admin SET Email = ?, Password = ? WHERE ID_ADMIN = ?";
    db.query(sql, [email, hashedPassword, req.params.id], (err) => {
        if (err) return res.status(500).send(err);
        res.sendStatus(200);
    });
});

// Delete Admin (Protected Route)
router.delete("/:id", verifyToken, (req, res) => {
    const sql = "DELETE FROM Admin WHERE ID_ADMIN = ?";
    db.query(sql, [req.params.id], (err) => {
        if (err) return res.status(500).send(err);
        res.sendStatus(200);
    });
});

module.exports = router;
