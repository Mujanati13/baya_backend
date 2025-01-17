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
    db.query("SELECT * FROM Commandes ORDER BY Date_cmd DESC", (error, rows) => {
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

router.get("/commands-by-date", async (req, res) => {
    try {
      const { start_date, end_date } = req.query;
  
      // Validate dates
      if (!start_date || !end_date) {
        return res.status(400).json({
          error: "Both start_date and end_date are required"
        });
      }
  
      const startDateObj = new Date(start_date);
      const endDateObj = new Date(end_date);
  
      if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        return res.status(400).json({
          error: "Invalid date format. Use YYYY-MM-DD"
        });
      }
  
      const sql = `
          SELECT 
        c.*,
        cl.NOM_CLT,
        cl.PRENOM_CLT,
        cl.TEL_CLT,
        cl.EMAIL_CLT
      FROM Commandes c
      LEFT JOIN Clients cl ON c.id_clt = cl.ID_CLT
      WHERE c.Date_cmd BETWEEN STR_TO_DATE(?, '%Y-%m-%d') AND STR_TO_DATE(?, '%Y-%m-%d')
      ORDER BY c.Date_cmd DESC`;

    const results = await query(sql, [start_date, end_date]);
    res.json(results);

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// PUT route to update order status
router.put("/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            error: "Invalid status",
            message: "Status must be one of: " + validStatuses.join(", ")
        });
    }

    const query = `
        UPDATE Commandes 
        SET statut_CMD = ?
        WHERE ID_CMD = ?
    `;

    db.query(query, [status, id], (error, result) => {
        if (error) {
            console.error("Error updating order status:", error);
            return res.status(500).json({ 
                error: "Internal server error",
                message: "Failed to update order status"
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                error: "Order not found",
                message: "No order found with the specified ID"
            });
        }

        // Create a record in the order history table
        const historyQuery = `
            INSERT INTO Commandes_Historique (
                ID_CMD,
                ancien_statut,
                nouveau_statut,
                date_modification
            ) VALUES (?, ?, ?, NOW())
        `;

        db.query(historyQuery, [id, null, status], (historyError) => {
            if (historyError) {
                console.error("Error recording status history:", historyError);
                // We still return success since the main update worked
            }
        });

        res.json({
            success: true,
            message: "Order status updated successfully",
            orderId: id,
            newStatus: status
        });
    });
});

// Optional: GET route to fetch order status history
router.get("/:id/status-history", (req, res) => {
    const { id } = req.params;

    const query = `
        SELECT 
            ID_Historique,
            ancien_statut,
            nouveau_statut,
            date_modification
        FROM Commandes_Historique
        WHERE ID_CMD = ?
        ORDER BY date_modification DESC
    `;

    db.query(query, [id], (error, rows) => {
        if (error) {
            console.error("Error fetching order status history:", error);
            return res.status(500).json({ 
                error: "Internal server error",
                message: "Failed to fetch order status history"
            });
        }

        res.json(rows);
    });
});


module.exports = router;