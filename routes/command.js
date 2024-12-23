const express = require("express");
const router = express.Router();
const db = require("../db");

router.post("/", async (req, res) => {
    try {
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

        // Modified this part
        const result = await db.execute(query, [
            1,
            detail_cmd,
            details_de_command,
            statut_CMD,
            montant,
            mode_payement,
            adresse_livraison,
            code_promo
        ] ,);

        // Access the result properly based on your DB library
        // const insertId = result[0].insertId;

        res.status(201).json({
            message: "Commande created successfully",
            // id: insertId
            success : true
        });
    } catch (error) {
        console.error("Error creating commande:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Read All - GET /api/commandes
router.get("/", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM commandes ORDER BY Date_cmd DESC");
        res.json(rows);
    } catch (error) {
        console.error("Error fetching commandes:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Read One - GET /api/commandes/:id

// Delete - DELETE /api/commandes/:id
router.delete("/:id", async (req, res) => {
    try {
        const [result] = await db.execute("DELETE FROM Commandes WHERE ID_CMD = ?", [
            req.params.id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Commande not found" });
        }

        res.json({ message: "Commande deleted successfully" });
    } catch (error) {
        console.error("Error deleting commande:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;