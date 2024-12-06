const express = require("express");
const router = express.Router();
const db = require("../db");

// Create Categorie
router.post("/", (req, res) => {
    const { Nom } = req.body;
    const sql = "INSERT INTO Categorie (Nom) VALUES (?)";
    db.query(sql, [Nom], (err, result) => {
        if (err) return res.status(500).send(err);
        res.status(201).json({ id: result.insertId, Nom });
    });
});

// Read Categories
router.get("/", (req, res) => {
    const sql = "SELECT * FROM Categorie";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// Update Categorie
router.put("/:id", (req, res) => {
    const { Nom,  } = req.body;
    const sql = "UPDATE Categorie SET Nom = ? WHERE ID_CAT = ?";
    db.query(sql, [Nom, req.params.id], (err) => {
        if (err) return res.status(500).send(err);
        res.sendStatus(200);
    });
});

// Delete Categorie
router.delete("/:id", (req, res) => {
    const sql = "DELETE FROM Categorie WHERE ID_CAT = ?";
    db.query(sql, [req.params.id], (err) => {
        if (err) return res.status(500).send(err);
        res.sendStatus(200);
    });
});

module.exports = router;
