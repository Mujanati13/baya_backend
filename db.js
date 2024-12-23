const mysql = require('mysql2');

Create a connection pool
const pool = mysql.createPool({
    host: "bayasho_db",
    user: "root",
    password: "password",
    database: "bayashop",
    waitForConnections: true,
    connectionLimit: 10, // Adjust based on your app's needs
    queueLimit: 0,
});

// const pool = mysql.createPool({
//     host: "localhost",
//     user: "root",
//     password: "simo1234",
//     database: "bayashop",
//     waitForConnections: true,
//     connectionLimit: 10, // Adjust based on your app's needs
//     queueLimit: 0,
// });

// Handle connection errors
pool.on('connection', (connection) => {
    console.log("New MySQL connection established.");
});

pool.on('acquire', (connection) => {
    console.log(`Connection ${connection.threadId} acquired.`);
});

pool.on('release', (connection) => {
    console.log(`Connection ${connection.threadId} released.`);
});

// Function to test database connectivity
pool.getConnection((err, connection) => {
    if (err) {
        console.error("Error connecting to the database:", err.message);
    } else {
        console.log("Connected to the MySQL database using connection pool.");
        connection.release(); // Release the connection back to the pool
    }
});

module.exports = pool;
