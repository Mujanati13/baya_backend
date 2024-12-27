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

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Get sales by month
router.get("/sales-by-month", asyncHandler(async (req, res) => {
    const { year = new Date().getFullYear() } = req.query;

    const sql = `
    SELECT 
      MONTH(c.Date_cmd) as month,
      YEAR(c.Date_cmd) as year,
      COUNT(DISTINCT c.ID_CMD) as total_orders,
      SUM(c.montant) as total_revenue,
      COUNT(dc.ID_ART) as items_sold,
      GROUP_CONCAT(DISTINCT a.Nom) as products_sold
    FROM Commandes c
    LEFT JOIN details_commande dc ON c.ID_CMD = dc.ID_CMD
    LEFT JOIN Article a ON dc.ID_ART = a.ID_ART
    WHERE YEAR(c.Date_cmd) = ?
    GROUP BY YEAR(c.Date_cmd), MONTH(c.Date_cmd)
    ORDER BY YEAR(c.Date_cmd), MONTH(c.Date_cmd)
  `;

    return new Promise((resolve, reject) => {
        db.query(sql, [year], (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return reject(res.status(500).json({
                    error: "Failed to retrieve sales data",
                    details: err.sqlMessage
                }));
            }

            // Process the results to include months with no sales
            const monthlyData = new Array(12).fill(null).map((_, index) => {
                const monthData = results.find(r => r.month === index + 1) || {
                    month: index + 1,
                    year: parseInt(year),
                    total_orders: 0,
                    total_revenue: 0,
                    items_sold: 0,
                    products_sold: ''
                };

                // Add month name
                monthData.month_name = new Date(year, index).toLocaleString('default', { month: 'long' });
                return monthData;
            });

            resolve(res.json({
                year: parseInt(year),
                monthly_sales: monthlyData,
                summary: {
                    total_annual_revenue: monthlyData.reduce((sum, month) => sum + month.total_revenue, 0),
                    total_annual_orders: monthlyData.reduce((sum, month) => sum + month.total_orders, 0),
                    total_items_sold: monthlyData.reduce((sum, month) => sum + month.items_sold, 0),
                    average_monthly_revenue: (monthlyData.reduce((sum, month) => sum + month.total_revenue, 0) / 12).toFixed(2)
                }
            }));
        });
    });
}));

// Get sales by product


module.exports = router;