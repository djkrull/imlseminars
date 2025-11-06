const { Pool } = require('pg');

let pool = null;
let useInMemoryStorage = false;
let inMemoryStore = [];

// Initialize database connection
async function initDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    // Use PostgreSQL if DATABASE_URL is provided
    console.log('Connecting to PostgreSQL database...');
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
      // Test connection
      await pool.query('SELECT NOW()');
      console.log('PostgreSQL connected successfully');

      // Create tables if they don't exist
      await createTables();
    } catch (error) {
      console.error('PostgreSQL connection error:', error);
      throw error;
    }
  } else {
    // Use in-memory storage for local development
    console.log('No DATABASE_URL found. Using in-memory storage for development.');
    console.log('Note: Data will be lost when the server restarts.');
    useInMemoryStorage = true;
    inMemoryStore = [];
  }
}

// Create database tables
async function createTables() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS talk_submissions (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      send_copy BOOLEAN DEFAULT false,
      talk_title TEXT NOT NULL,
      talk_abstract TEXT NOT NULL,
      affiliation VARCHAR(500) NOT NULL,
      questions TEXT,
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(createTableQuery);
    console.log('Database tables created/verified successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
}

// Insert a new talk submission
async function insertTalkSubmission(data) {
  if (useInMemoryStorage) {
    // In-memory storage
    const submission = {
      id: inMemoryStore.length + 1,
      ...data,
      submitted_at: new Date()
    };
    inMemoryStore.push(submission);
    return submission;
  } else {
    // PostgreSQL
    const query = `
      INSERT INTO talk_submissions
      (first_name, last_name, email, send_copy, talk_title, talk_abstract, affiliation, questions)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const values = [
      data.first_name,
      data.last_name,
      data.email,
      data.send_copy || false,
      data.talk_title,
      data.talk_abstract,
      data.affiliation,
      data.questions || null
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }
}

// Get all talk submissions
async function getAllTalkSubmissions() {
  if (useInMemoryStorage) {
    // Return in-memory data, sorted by most recent first
    return [...inMemoryStore].reverse();
  } else {
    // PostgreSQL
    const query = 'SELECT * FROM talk_submissions ORDER BY submitted_at DESC';
    const result = await pool.query(query);
    return result.rows;
  }
}

// Get a single talk submission by ID
async function getTalkSubmissionById(id) {
  if (useInMemoryStorage) {
    return inMemoryStore.find(item => item.id === parseInt(id));
  } else {
    const query = 'SELECT * FROM talk_submissions WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

// Delete a talk submission by ID
async function deleteTalkSubmission(id) {
  if (useInMemoryStorage) {
    const index = inMemoryStore.findIndex(item => item.id === parseInt(id));
    if (index > -1) {
      inMemoryStore.splice(index, 1);
      return true;
    }
    return false;
  } else {
    const query = 'DELETE FROM talk_submissions WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rowCount > 0;
  }
}

// Close database connection
async function closeDatabase() {
  if (pool) {
    await pool.end();
    console.log('Database connection closed');
  }
}

module.exports = {
  initDatabase,
  insertTalkSubmission,
  getAllTalkSubmissions,
  getTalkSubmissionById,
  deleteTalkSubmission,
  closeDatabase
};
