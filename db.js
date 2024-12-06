const mysql = require("mysql2");

// Database connection
const db = mysql.createConnection({
    host: "84.247.166.36",
    user: "root",
    password: "simo1234",
    database: "bayashop",
});

db.connect((err) => {
    if (err) {
        console.error("Error connecting to the database:", err.message);
    } else {
        console.log("Connected to the MySQL database.");
    }
});

module.exports = db;
