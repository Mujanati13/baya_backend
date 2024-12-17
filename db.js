const mysql = require("mysql2");

// Database connection
const db = mysql.createConnection({
    host: "mysql",
    user: "node_user",
    password: "node_password",
    database: "bayashop_db",
});

db.connect((err) => {
    if (err) {
        console.error("Error connecting to the database:", err.message);
    } else {
        console.log("Connected to the MySQL database.");
    }
});

module.exports = db;
