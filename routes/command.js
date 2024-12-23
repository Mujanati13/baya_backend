const express = require("express");
const router = express.Router();
const db = require("../db");

// POST route
router.post("/", (req, res) => {
    const {
        detail_cmd,
        details_de_command,
        statut_CMD,
        montant,
        mode_payement,
        adresse_livraison,
        code_promo
    } = req.body;

    const query = `
        INSERT INTO Commandes (
            id_clt, 
            detail_cmd, 
            details_de_command, 
            Date_cmd,
            statut_CMD, 
            montant, 
            mode_payement, 
            adresse_livraison, 
            code_promo
        ) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?)
    `;

    db.query(query, [
        1,
        detail_cmd,
        details_de_command,
        statut_CMD,
        montant,
        mode_payement,
        adresse_livraison,
        code_promo
    ], (error, result) => {
        if (error) {
            console.error("Error creating commande:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
        res.status(201).json({
            message: "Commande created successfully",
            success: true,
            id: result.insertId
        });
    });
});

// GET route
router.get("/", (req, res) => {
    db.query("SELECT * FROM commandes ORDER BY Date_cmd DESC", (error, rows) => {
        if (error) {
            console.error("Error fetching commandes:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
        res.json(rows);
    });
});

// DELETE route
router.delete("/:id", (req, res) => {
    db.query("DELETE FROM Commandes WHERE ID_CMD = ?", [req.params.id], (error, result) => {
        if (error) {
            console.error("Error deleting commande:", error);
            return res.status(500).json({ error: "Internal server error" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Commande not found" });
        }

        res.json({ message: "Commande deleted successfully" });
    });
});

module.exports = router;