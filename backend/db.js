require("dotenv").config();
const mysql = require("mysql2/promise");

// create pool (NOT createConnection)
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// optional: test connection
const testConnection = async () => {
  try {
    const conn = await db.getConnection();
    console.log("Connected to MySQL!");
    conn.release();
  } catch (err) {
    console.log("DB Error:", err);
  }
};

testConnection();

module.exports = db;