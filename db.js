const mariadb = require("mariadb"); // Using 'mariadb' package

const pool = mariadb.createPool({
  host: "51.38.99.75",
  user: "root",
  port: "3306", // MariaDB default port
  password: "password",
  database: "bayashop",
  connectionLimit: 10, // Adjust based on your app's needs
});

// Handle connection errors
pool.on("connection", (connection) => {
  console.log("New MySQL connection established.");
});

pool.on("acquire", (connection) => {
  console.log(`Connection ${connection.threadId} acquired.`);
});

pool.on("release", (connection) => {
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
