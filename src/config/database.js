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
  const createTablesQuery = `
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

    CREATE TABLE IF NOT EXISTS rooms (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      building VARCHAR(255),
      capacity INTEGER,
      features JSONB,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scheduled_talks (
      id SERIAL PRIMARY KEY,
      submission_id INTEGER REFERENCES talk_submissions(id) ON DELETE CASCADE,
      room_id INTEGER REFERENCES rooms(id),
      event_title VARCHAR(500),
      event_speaker VARCHAR(255),
      event_affiliation VARCHAR(255),
      event_abstract TEXT,
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP NOT NULL,
      status VARCHAR(50) DEFAULT 'scheduled',
      publish_to_website BOOLEAN DEFAULT false,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Insert default rooms if they don't exist
    INSERT INTO rooms (name, building, capacity) VALUES
      ('Kuskvillan', 'Main Campus', 50),
      ('Gula villan', 'Main Campus', 30),
      ('Main building', 'Main Campus', 100),
      ('KTH Lecture room K1', 'KTH Teknikringen 56', 80)
    ON CONFLICT (name) DO NOTHING;
  `;

  try {
    await pool.query(createTablesQuery);
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

// Get all rooms
async function getAllRooms() {
  if (useInMemoryStorage) {
    return [];
  } else {
    const query = 'SELECT * FROM rooms WHERE is_active = true ORDER BY name';
    const result = await pool.query(query);
    return result.rows;
  }
}

// Get all scheduled talks with submission and room details
async function getAllScheduledTalks() {
  if (useInMemoryStorage) {
    return [];
  } else {
    const query = `
      SELECT
        st.*,
        ts.first_name, ts.last_name, ts.email, ts.talk_title,
        ts.talk_abstract, ts.affiliation, ts.questions,
        r.name as room_name, r.building as room_building
      FROM scheduled_talks st
      LEFT JOIN talk_submissions ts ON st.submission_id = ts.id
      LEFT JOIN rooms r ON st.room_id = r.id
      ORDER BY st.start_time
    `;
    const result = await pool.query(query);
    return result.rows;
  }
}

// Create a scheduled talk or event
async function createScheduledTalk(data) {
  if (useInMemoryStorage) {
    return { id: 1, ...data };
  } else {
    const query = `
      INSERT INTO scheduled_talks
      (submission_id, room_id, event_title, event_speaker, event_affiliation, event_abstract,
       start_time, end_time, status, publish_to_website, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;
    const values = [
      data.submission_id || null,
      data.room_id,
      data.event_title || null,
      data.event_speaker || null,
      data.event_affiliation || null,
      data.event_abstract || null,
      data.start_time,
      data.end_time,
      data.status || 'scheduled',
      data.publish_to_website || false,
      data.notes || null
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }
}

// Update a scheduled talk or event
async function updateScheduledTalk(id, data) {
  if (useInMemoryStorage) {
    return { id, ...data };
  } else {
    const query = `
      UPDATE scheduled_talks
      SET
        room_id = COALESCE($1, room_id),
        event_title = COALESCE($2, event_title),
        event_speaker = COALESCE($3, event_speaker),
        event_affiliation = COALESCE($4, event_affiliation),
        event_abstract = COALESCE($5, event_abstract),
        start_time = COALESCE($6, start_time),
        end_time = COALESCE($7, end_time),
        status = COALESCE($8, status),
        publish_to_website = COALESCE($9, publish_to_website),
        notes = COALESCE($10, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *;
    `;
    const values = [
      data.room_id,
      data.event_title,
      data.event_speaker,
      data.event_affiliation,
      data.event_abstract,
      data.start_time,
      data.end_time,
      data.status,
      data.publish_to_website,
      data.notes,
      id
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }
}

// Delete a scheduled talk
async function deleteScheduledTalk(id) {
  if (useInMemoryStorage) {
    return true;
  } else {
    const query = 'DELETE FROM scheduled_talks WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rowCount > 0;
  }
}

// Check for conflicts
async function checkSchedulingConflicts(roomId, startTime, endTime, excludeId = null) {
  if (useInMemoryStorage) {
    return [];
  } else {
    const query = `
      SELECT st.*, ts.first_name, ts.last_name, ts.talk_title
      FROM scheduled_talks st
      LEFT JOIN talk_submissions ts ON st.submission_id = ts.id
      WHERE st.room_id = $1
      AND st.id != COALESCE($4, -1)
      AND (
        (st.start_time < $3 AND st.end_time > $2)
      )
    `;
    const result = await pool.query(query, [roomId, startTime, endTime, excludeId]);
    return result.rows;
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
  getAllRooms,
  getAllScheduledTalks,
  createScheduledTalk,
  updateScheduledTalk,
  deleteScheduledTalk,
  checkSchedulingConflicts,
  closeDatabase
};
