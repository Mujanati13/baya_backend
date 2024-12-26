const express = require("express");
const router = express.Router();
const db = require("../db");

// Async wrapper for cleaner error handling
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// 1. Get total revenue and orders by status
router.get("/revenue-stats", asyncHandler(async (req, res) => {
    const sql = `
    SELECT 
      SUM(montant) as total_revenue,
      statut_CMD,
      COUNT(*) as order_count
    FROM Commandes 
    GROUP BY statut_CMD
  `;

    return new Promise((resolve, reject) => {
        db.query(sql, (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return reject(res.status(500).json({
                    error: "Failed to retrieve revenue stats",
                    details: err.sqlMessage
                }));
            }
            resolve(res.json(results));
        });
    });
}));

// 2. Get top selling products
router.get("/top-products", asyncHandler(async (req, res) => {
    const limit = req.query.limit || 5;
    const sql = `
    SELECT 
      a.ID_ART,
      a.Nom,
      a.Prix,
      SUM(a.Quantite) as total_sold
    FROM Article a
    JOIN Commandes c ON FIND_IN_SET(a.ID_ART, c.detail_cmd)
    GROUP BY a.ID_ART, a.Nom, a.Prix
    ORDER BY total_sold DESC
    LIMIT ?
  `;

    return new Promise((resolve, reject) => {
        db.query(sql, [parseInt(limit)], (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return reject(res.status(500).json({
                    error: "Failed to retrieve top products",
                    details: err.sqlMessage
                }));
            }
            resolve(res.json(results));
        });
    });
}));

// 3. Get category statistics
router.get("/category-stats", asyncHandler(async (req, res) => {
    const sql = `
    SELECT 
      c.ID_CAT,
      c.Nom as category_name,
      COUNT(a.ID_ART) as product_count,
      SUM(a.Quantite) as total_stock
    FROM Categorie c
    LEFT JOIN Article a ON c.ID_CAT = a.ID_CAT
    GROUP BY c.ID_CAT, c.Nom
  `;

    return new Promise((resolve, reject) => {
        db.query(sql, (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return reject(res.status(500).json({
                    error: "Failed to retrieve category stats",
                    details: err.sqlMessage
                }));
            }
            resolve(res.json(results));
        });
    });
}));

// 4. Get low stock alerts
router.get("/low-stock", asyncHandler(async (req, res) => {
    const threshold = req.query.threshold || 5;
    const sql = `
    SELECT 
      ID_ART,
      Nom,
      Quantite,
      Prix
    FROM Article
    WHERE Quantite <= ?
    ORDER BY Quantite ASC
  `;

    return new Promise((resolve, reject) => {
        db.query(sql, [parseInt(threshold)], (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return reject(res.status(500).json({
                    error: "Failed to retrieve low stock items",
                    details: err.sqlMessage
                }));
            }
            resolve(res.json(results));
        });
    });
}));

// 5. Get recent orders with details
router.get("/recent-orders", asyncHandler(async (req, res) => {
    const limit = req.query.limit || 10;
    const sql = `
    SELECT 
      c.ID_CMD,
      c.Date_cmd,
      c.montant,
      c.statut_CMD,
      c.mode_payement,
      GROUP_CONCAT(a.Nom) as products
    FROM Commandes c
    LEFT JOIN Article a ON FIND_IN_SET(a.ID_ART, c.detail_cmd)
    GROUP BY c.ID_CMD
    ORDER BY c.Date_cmd DESC
    LIMIT ?
  `;

    return new Promise((resolve, reject) => {
        db.query(sql, [parseInt(limit)], (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return reject(res.status(500).json({
                    error: "Failed to retrieve recent orders",
                    details: err.sqlMessage
                }));
            }
            resolve(res.json(results));
        });
    });
}));

// 6. Get sales trends
router.get("/sales-trends", asyncHandler(async (req, res) => {
    const period = req.query.period || 'daily'; // daily, weekly, monthly
    let groupBy, dateFormat;

    switch(period) {
        case 'weekly':
            dateFormat = '%Y-%u';
            groupBy = 'YEARWEEK(Date_cmd)';
            break;
        case 'monthly':
            dateFormat = '%Y-%m';
            groupBy = 'YEAR(Date_cmd), MONTH(Date_cmd)';
            break;
        default:
            dateFormat = '%Y-%m-%d';
            groupBy = 'DATE(Date_cmd)';
    }

    const sql = `
    SELECT 
      DATE_FORMAT(Date_cmd, ?) as period,
      COUNT(*) as order_count,
      SUM(montant) as total_sales
    FROM Commandes
    WHERE Date_cmd >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY ${groupBy}
    ORDER BY Date_cmd DESC
  `;

    return new Promise((resolve, reject) => {
        db.query(sql, [dateFormat], (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return reject(res.status(500).json({
                    error: "Failed to retrieve sales trends",
                    details: err.sqlMessage
                }));
            }
            resolve(res.json(results));
        });
    });
}));

// Global error handler
router.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: "Unexpected error occurred",
        details: err.message
    });
});

module.exports = router;