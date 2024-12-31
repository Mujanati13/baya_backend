const express = require("express");
const router = express.Router();
const db = require("../db");

// Async wrapper for cleaner error handling
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 1. Get total revenue and orders by status
router.get(
  "/revenue-stats",
  asyncHandler(async (req, res) => {
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
          console.error("Database error:", err);
          return reject(
            res.status(500).json({
              error: "Failed to retrieve revenue stats",
              details: err.sqlMessage,
            })
          );
        }
        resolve(res.json(results));
      });
    });
  })
);

// 2. Get top selling products
router.get(
  "/top-products",
  asyncHandler(async (req, res) => {
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
          console.error("Database error:", err);
          return reject(
            res.status(500).json({
              error: "Failed to retrieve top products",
              details: err.sqlMessage,
            })
          );
        }
        resolve(res.json(results));
      });
    });
  })
);

// 3. Get category statistics
router.get(
  "/category-stats",
  asyncHandler(async (req, res) => {
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
          console.error("Database error:", err);
          return reject(
            res.status(500).json({
              error: "Failed to retrieve category stats",
              details: err.sqlMessage,
            })
          );
        }
        resolve(res.json(results));
      });
    });
  })
);

// 4. Get low stock alerts
router.get(
  "/low-stock",
  asyncHandler(async (req, res) => {
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
          console.error("Database error:", err);
          return reject(
            res.status(500).json({
              error: "Failed to retrieve low stock items",
              details: err.sqlMessage,
            })
          );
        }
        resolve(res.json(results));
      });
    });
  })
);

// 5. Get recent orders with details
router.get(
  "/recent-orders",
  asyncHandler(async (req, res) => {
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
          console.error("Database error:", err);
          return reject(
            res.status(500).json({
              error: "Failed to retrieve recent orders",
              details: err.sqlMessage,
            })
          );
        }
        resolve(res.json(results));
      });
    });
  })
);

// 6. Get sales trends
router.get(
  "/sales-trends",
  asyncHandler(async (req, res) => {
    const period = req.query.period || "daily"; // daily, weekly, monthly
    let groupBy, dateFormat, orderBy;

    switch (period) {
      case "weekly":
        dateFormat = "%Y-%u";
        groupBy = "YEAR(Date_cmd), WEEK(Date_cmd)";
        orderBy = "YEAR(Date_cmd) DESC, WEEK(Date_cmd) DESC";
        break;
      case "monthly":
        dateFormat = "%Y-%m";
        groupBy = "YEAR(Date_cmd), MONTH(Date_cmd)";
        orderBy = "YEAR(Date_cmd) DESC, MONTH(Date_cmd) DESC";
        break;
      default:
        dateFormat = "%Y-%m-%d";
        groupBy = "DATE(Date_cmd)";
        orderBy = "Date_cmd DESC";
    }

    const sql = `
    SELECT 
      DATE_FORMAT(Date_cmd, ?) AS period,
      COUNT(*) AS order_count,
      SUM(montant) AS total_sales
    FROM Commandes
    WHERE Date_cmd >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY ${groupBy}
    ORDER BY ${orderBy}
  `;

    return new Promise((resolve, reject) => {
      db.query(sql, [dateFormat], (err, results) => {
        if (err) {
          console.error("Database error:", err);
          return reject(
            res.status(500).json({
              error: "Failed to retrieve sales trends",
              details: err.sqlMessage,
            })
          );
        }
        resolve(res.json(results));
      });
    });
  })
);

router.get(
  "/product-performance/:month?",
  asyncHandler(async (req, res) => {
    const { month } = req.params;
    const { year = new Date().getFullYear() } = req.query;

    const sql = `
    SELECT 
      c.Date_cmd,
      c.detail_cmd,
      c.montant
    FROM Commandes c
    WHERE YEAR(c.Date_cmd) = ?
    ${month ? "AND MONTH(c.Date_cmd) = ?" : ""}
    ORDER BY c.Date_cmd DESC
  `;

    const queryParams = month ? [year, month] : [year];

    return new Promise((resolve, reject) => {
      db.query(sql, queryParams, (err, results) => {
        if (err) {
          console.error("Database error:", err);
          return reject(
            res.status(500).json({
              error: "Failed to retrieve product sales data",
              details: err.sqlMessage,
            })
          );
        }

        // Process the results to aggregate product data
        const productStats = {};
        let totalRevenue = 0;
        let totalOrders = results.length;

        results.forEach((order) => {
          totalRevenue += order.montant;

          try {
            const orderDetails = JSON.parse(order.detail_cmd || "[]");
            orderDetails.forEach((item) => {
              if (!productStats[item.id]) {
                productStats[item.id] = {
                  product_id: item.id,
                  product_name: item.name,
                  quantity_sold: 0,
                  number_of_orders: 0,
                };
              }
              productStats[item.id].quantity_sold += item.quantity || 1;
              productStats[item.id].number_of_orders += 1;
            });
          } catch (e) {
            console.error("Error parsing order details:", e);
          }
        });

        const products = Object.values(productStats).sort(
          (a, b) => b.quantity_sold - a.quantity_sold
        );

        resolve(
          res.json({
            year: parseInt(year),
            month: month ? parseInt(month) : "all",
            products: products,
            summary: {
              total_products_sold: products.reduce(
                (sum, product) => sum + product.quantity_sold,
                0
              ),
              total_revenue: totalRevenue,
              total_orders: totalOrders,
              average_order_value:
                totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0,
            },
          })
        );
      });
    });
  })
);

// Get sales by month
router.get(
  "/sales-by-month",
  asyncHandler(async (req, res) => {
    const { year = new Date().getFullYear() } = req.query;

    const sql = `
    SELECT 
      MONTH(Date_cmd) as month,
      YEAR(Date_cmd) as year,
      COUNT(ID_CMD) as total_orders,
      SUM(montant) as total_revenue,
      GROUP_CONCAT(detail_cmd) as order_details
    FROM Commandes
    WHERE YEAR(Date_cmd) = ?
    GROUP BY YEAR(Date_cmd), MONTH(Date_cmd)
    ORDER BY YEAR(Date_cmd), MONTH(Date_cmd)
  `;

    return new Promise((resolve, reject) => {
      db.query(sql, [year], (err, results) => {
        if (err) {
          console.error("Database error:", err);
          return reject(
            res.status(500).json({
              error: "Failed to retrieve sales data",
              details: err.sqlMessage,
            })
          );
        }

        // Process the results to include months with no sales and calculate items sold
        const monthlyData = new Array(12).fill(null).map((_, index) => {
          const monthData = results.find((r) => r.month === index + 1) || {
            month: index + 1,
            year: parseInt(year),
            total_orders: 0,
            total_revenue: 0,
            order_details: "",
          };

          // Calculate items sold from detail_cmd if available
          try {
            monthData.items_sold = monthData.order_details
              .split(",")
              .reduce((total, detail) => {
                const items = JSON.parse(detail || "[]");
                return total + (Array.isArray(items) ? items.length : 0);
              }, 0);
          } catch (e) {
            monthData.items_sold = 0;
          }

          // Add month name
          monthData.month_name = new Date(year, index).toLocaleString(
            "default",
            { month: "long" }
          );

          // Remove the raw order_details from the response
          delete monthData.order_details;

          return monthData;
        });

        resolve(
          res.json({
            year: parseInt(year),
            monthly_sales: monthlyData,
            summary: {
              total_annual_revenue: monthlyData.reduce(
                (sum, month) => sum + month.total_revenue,
                0
              ),
              total_annual_orders: monthlyData.reduce(
                (sum, month) => sum + month.total_orders,
                0
              ),
              total_items_sold: monthlyData.reduce(
                (sum, month) => sum + month.items_sold,
                0
              ),
              average_monthly_revenue: (
                monthlyData.reduce(
                  (sum, month) => sum + month.total_revenue,
                  0
                ) / 12
              ).toFixed(2),
            },
          })
        );
      });
    });
  })
);

// Get product sales statistics for current month
router.get(
  "/product-sales-stats",
  asyncHandler(async (req, res) => {
    const sql = `
    SELECT 
      a.ID_ART,
      a.Nom as product_name,
      COUNT(c.ID_ART) as units_sold,
      SUM(c.quantite) as total_quantity,
      SUM(c.prix_unitaire * dc.quantite) as total_revenue,
      MIN(c.prix_unitaire) as min_price,
      MAX(c.prix_unitaire) as max_price,
      COUNT(DISTINCT c.ID_CMD) as number_of_orders
    FROM Commandes c
    JOIN Article a ON c.ID_ART = a.ID_ART
    WHERE 
      MONTH(c.Date_cmd) = MONTH(CURRENT_DATE())
      AND YEAR(c.Date_cmd) = YEAR(CURRENT_DATE())
    GROUP BY a.ID_ART, a.Nom
    ORDER BY total_revenue DESC
  `;

    return new Promise((resolve, reject) => {
      db.query(sql, (err, results) => {
        if (err) {
          console.error("Database error:", err);
          return reject(
            res.status(500).json({
              error: "Failed to retrieve product sales statistics",
              details: err.sqlMessage,
            })
          );
        }

        // Calculate summary statistics
        const summary = {
          total_products_sold: results.reduce(
            (sum, product) => sum + product.units_sold,
            0
          ),
          total_revenue: results.reduce(
            (sum, product) => sum + product.total_revenue,
            0
          ),
          average_order_value:
            results.reduce((sum, product) => sum + product.total_revenue, 0) /
              results.reduce(
                (sum, product) => sum + product.number_of_orders,
                0
              ) || 0,
          best_selling_product:
            results.length > 0
              ? {
                  name: results[0].product_name,
                  units_sold: results[0].units_sold,
                }
              : null,
          total_unique_products: results.length,
        };

        resolve(
          res.json({
            current_month: new Date().toLocaleString("default", {
              month: "long",
              year: "numeric",
            }),
            summary,
            products: results,
          })
        );
      });
    });
  })
);

router.get(
  "/sales-by-product",
  asyncHandler(async (req, res) => {
    const sql = `
    WITH RECURSIVE JsonItems AS (
        SELECT 
            c.ID_CMD,
            JSON_EXTRACT(item.value, '$.id') as article_id,
            JSON_EXTRACT(item.value, '$.quantity') as quantity,
            JSON_EXTRACT(item.value, '$.price') as unit_price,
            c.Date_cmd
        FROM 
            Commandes c,
            JSON_TABLE(
                JSON_EXTRACT(c.detail_cmd, '$.items'),
                '$[*]' COLUMNS (value JSON PATH '$')
            ) AS item
        WHERE 
            c.statut_CMD != 'cancelled'
            AND MONTH(c.Date_cmd) = MONTH(CURRENT_DATE())
            AND YEAR(c.Date_cmd) = YEAR(CURRENT_DATE())
    )
    SELECT 
        a.ID_ART,
        a.Nom as product_name,
        a.Prix as current_price,
        a.Quantite as current_stock,
        COUNT(DISTINCT ji.ID_CMD) as total_orders,
        COALESCE(SUM(CAST(ji.quantity AS DECIMAL)), 0) as total_quantity_sold,
        COALESCE(SUM(CAST(ji.quantity AS DECIMAL) * CAST(ji.unit_price AS DECIMAL)), 0) as total_revenue,
        MAX(ji.Date_cmd) as last_sale_date
    FROM 
        Article a
    LEFT JOIN JsonItems ji ON a.ID_ART = CAST(ji.article_id AS UNSIGNED)
    GROUP BY 
        a.ID_ART, a.Nom, a.Prix, a.Quantite
    ORDER BY 
        total_revenue DESC`;

    return new Promise((resolve, reject) => {
      db.query(sql, (err, results) => {
        if (err) {
          return reject(
            res.status(500).json({
              error: "Failed to retrieve sales data",
              details: err.sqlMessage,
            })
          );
        }

        const summary = {
          total_products: results.length,
          total_orders: results.reduce((sum, p) => sum + p.total_orders, 0),
          total_units: results.reduce(
            (sum, p) => sum + p.total_quantity_sold,
            0
          ),
          total_revenue: results.reduce((sum, p) => sum + p.total_revenue, 0),
        };

        resolve(
          res.json({
            current_month: new Date().toLocaleString("default", {
              month: "long",
              year: "numeric",
            }),
            summary,
            products: results.map((p) => ({
              ...p,
              stock_status: p.current_stock < 5 ? "low" : "normal",
              average_order_value: p.total_orders
                ? (p.total_revenue / p.total_orders).toFixed(2)
                : 0,
            })),
          })
        );
      });
    });
  })
);

// Global error handler
router.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Unexpected error occurred",
    details: err.message,
  });
});

module.exports = router;
