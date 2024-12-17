const mysql = require("mysql2");

// Database connection
const db = mysql.createConnection({
    host: "mysql",
    user: "root",
    password: "password",
    database: "bayashop",
    port: 3307,
});

db.connect((err) => {
    if (err) {
        console.error("Error connecting to the database:", err.message);
    } else {
        console.log("Connected to the MySQL database.");
    }
});

module.exports = db;
