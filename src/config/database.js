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
    CREATE TABLE IF NOT EXISTS programs (
      program_id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      status VARCHAR(20) DEFAULT 'PLANNED',
      color VARCHAR(20) DEFAULT 'purple',
      synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workshops (
      workshop_id VARCHAR(50) PRIMARY KEY,
      program_id VARCHAR(50) REFERENCES programs(program_id),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      color VARCHAR(10) DEFAULT '#969696',
      synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

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

    -- Add block/lock columns if they don't exist
    ALTER TABLE scheduled_talks ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
    ALTER TABLE scheduled_talks ADD COLUMN IF NOT EXISTS is_block BOOLEAN DEFAULT false;
    ALTER TABLE scheduled_talks ADD COLUMN IF NOT EXISTS repeat_group_id VARCHAR(36) DEFAULT NULL;

    -- Magic links for external users
    CREATE TABLE IF NOT EXISTS magic_links (
      id SERIAL PRIMARY KEY,
      token VARCHAR(64) NOT NULL UNIQUE,
      label VARCHAR(255),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP
    );

    -- Add program_id columns to existing tables
    ALTER TABLE talk_submissions ADD COLUMN IF NOT EXISTS program_id VARCHAR(50) REFERENCES programs(program_id);
    ALTER TABLE scheduled_talks ADD COLUMN IF NOT EXISTS program_id VARCHAR(50) REFERENCES programs(program_id);
    ALTER TABLE magic_links ADD COLUMN IF NOT EXISTS program_id VARCHAR(50) REFERENCES programs(program_id);

    -- Add workshop_id columns to existing tables
    ALTER TABLE talk_submissions ADD COLUMN IF NOT EXISTS workshop_id VARCHAR(50) REFERENCES workshops(workshop_id);
    ALTER TABLE scheduled_talks ADD COLUMN IF NOT EXISTS workshop_id VARCHAR(50) REFERENCES workshops(workshop_id);
    ALTER TABLE magic_links ADD COLUMN IF NOT EXISTS workshop_id VARCHAR(50) REFERENCES workshops(workshop_id);

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
      (first_name, last_name, email, send_copy, talk_title, talk_abstract, affiliation, questions, program_id, workshop_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
      data.questions || null,
      data.programId || data.program_id || null,
      data.workshop_id || data.workshopId || null
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
async function getAllScheduledTalks(programId, workshopId) {
  if (useInMemoryStorage) {
    return [];
  } else {
    let query = `
      SELECT
        st.*,
        ts.first_name, ts.last_name, ts.email, ts.talk_title,
        ts.talk_abstract, ts.affiliation, ts.questions,
        r.name as room_name, r.building as room_building
      FROM scheduled_talks st
      LEFT JOIN talk_submissions ts ON st.submission_id = ts.id
      LEFT JOIN rooms r ON st.room_id = r.id
    `;
    const params = [];
    const conditions = [];
    if (programId) {
      params.push(programId);
      conditions.push(`st.program_id = $${params.length}`);
    }
    if (workshopId) {
      params.push(workshopId);
      conditions.push(`st.workshop_id = $${params.length}`);
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY st.start_time';
    const result = await pool.query(query, params);
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
       start_time, end_time, status, publish_to_website, notes, is_locked, is_block, repeat_group_id, program_id, workshop_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *;
    `;
    const values = [
      data.submission_id || null,
      data.room_id || null,
      data.event_title || null,
      data.event_speaker || null,
      data.event_affiliation || null,
      data.event_abstract || null,
      data.start_time,
      data.end_time,
      data.status || 'scheduled',
      data.publish_to_website || false,
      data.notes || null,
      data.is_locked || false,
      data.is_block || false,
      data.repeat_group_id || null,
      data.program_id || null,
      data.workshop_id || null
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
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    const fields = [
      ['room_id', data.room_id],
      ['event_title', data.event_title],
      ['event_speaker', data.event_speaker],
      ['event_affiliation', data.event_affiliation],
      ['event_abstract', data.event_abstract],
      ['start_time', data.start_time],
      ['end_time', data.end_time],
      ['status', data.status],
      ['publish_to_website', data.publish_to_website],
      ['notes', data.notes],
      ['is_locked', data.is_locked]
    ];

    for (const [col, val] of fields) {
      if (val !== undefined) {
        setClauses.push(`${col} = $${paramIndex}`);
        values.push(val);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      const current = await pool.query('SELECT * FROM scheduled_talks WHERE id = $1', [id]);
      return current.rows[0];
    }

    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `
      UPDATE scheduled_talks
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *;
    `;
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
async function checkSchedulingConflicts(roomId, startTime, endTime, excludeId = null, programId = null, workshopId = null) {
  if (useInMemoryStorage) {
    return [];
  } else {
    let query = `
      SELECT st.*, ts.first_name, ts.last_name, ts.talk_title
      FROM scheduled_talks st
      LEFT JOIN talk_submissions ts ON st.submission_id = ts.id
      WHERE st.room_id = $1
      AND st.id != COALESCE($4, -1)
      AND (
        (st.start_time < $3 AND st.end_time > $2)
      )
    `;
    const params = [roomId, startTime, endTime, excludeId];
    if (programId) {
      params.push(programId);
      query += ` AND st.program_id = $${params.length}`;
    }
    if (workshopId) {
      params.push(workshopId);
      query += ` AND st.workshop_id = $${params.length}`;
    }
    const result = await pool.query(query, params);
    return result.rows;
  }
}

// Get a single scheduled talk by ID
async function getScheduledTalkById(id) {
  if (useInMemoryStorage) {
    return null;
  } else {
    const query = 'SELECT * FROM scheduled_talks WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

// Create multiple scheduled talks in a transaction (for repeating blocks)
async function createScheduledTalksInBatch(items) {
  if (useInMemoryStorage) {
    return items.map((item, i) => ({ id: i + 1, ...item }));
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const results = [];
    for (const data of items) {
      const query = `
        INSERT INTO scheduled_talks
        (submission_id, room_id, event_title, event_speaker, event_affiliation, event_abstract,
         start_time, end_time, status, publish_to_website, notes, is_locked, is_block, repeat_group_id, program_id, workshop_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *;
      `;
      const values = [
        null,
        data.room_id || null,
        data.event_title || null,
        data.event_speaker || null,
        data.event_affiliation || null,
        data.event_abstract || null,
        data.start_time,
        data.end_time,
        data.status || 'scheduled',
        data.publish_to_website || false,
        data.notes || null,
        data.is_locked || false,
        true,
        data.repeat_group_id,
        data.program_id || null,
        data.workshop_id || null
      ];
      const result = await client.query(query, values);
      results.push(result.rows[0]);
    }
    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Delete all instances in a repeat group
async function deleteByRepeatGroup(groupId) {
  if (useInMemoryStorage) {
    return true;
  } else {
    const query = 'DELETE FROM scheduled_talks WHERE repeat_group_id = $1';
    const result = await pool.query(query, [groupId]);
    return result.rowCount > 0;
  }
}

// Update all instances in a repeat group
async function updateByRepeatGroup(groupId, data) {
  if (useInMemoryStorage) {
    return [];
  }
  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  const fields = [
    ['event_title', data.event_title],
    ['room_id', data.room_id],
    ['is_locked', data.is_locked],
    ['notes', data.notes],
    ['publish_to_website', data.publish_to_website],
    ['status', data.status]
  ];

  for (const [col, val] of fields) {
    if (val !== undefined) {
      setClauses.push(`${col} = $${paramIndex}`);
      values.push(val);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) return [];

  setClauses.push('updated_at = CURRENT_TIMESTAMP');
  values.push(groupId);

  const query = `
    UPDATE scheduled_talks
    SET ${setClauses.join(', ')}
    WHERE repeat_group_id = $${paramIndex}
    RETURNING *;
  `;
  const result = await pool.query(query, values);
  return result.rows;
}

// Check if any item in a repeat group is locked
async function isRepeatGroupLocked(groupId) {
  if (useInMemoryStorage) return false;
  const query = 'SELECT COUNT(*) as cnt FROM scheduled_talks WHERE repeat_group_id = $1 AND is_locked = true';
  const result = await pool.query(query, [groupId]);
  return parseInt(result.rows[0].cnt) > 0;
}

// Create a magic link
async function createMagicLink(token, label, expiresAt, programId, workshopId) {
  if (useInMemoryStorage) {
    return { id: 1, token, label, is_active: true, created_at: new Date(), expires_at: expiresAt, program_id: programId || null, workshop_id: workshopId || null };
  }
  const query = `
    INSERT INTO magic_links (token, label, expires_at, program_id, workshop_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const result = await pool.query(query, [token, label || null, expiresAt || null, programId || null, workshopId || null]);
  return result.rows[0];
}

// Validate a magic link token
async function validateMagicLink(token) {
  if (useInMemoryStorage) return null;
  const query = `
    SELECT * FROM magic_links
    WHERE token = $1 AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  `;
  const result = await pool.query(query, [token]);
  return result.rows[0] || null;
}

// Get all magic links
async function getAllMagicLinks(programId, workshopId) {
  if (useInMemoryStorage) return [];
  let query = 'SELECT * FROM magic_links';
  const params = [];
  const conditions = [];
  if (programId) {
    params.push(programId);
    conditions.push(`program_id = $${params.length}`);
  }
  if (workshopId) {
    params.push(workshopId);
    conditions.push(`workshop_id = $${params.length}`);
  }
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY created_at DESC';
  const result = await pool.query(query, params);
  return result.rows;
}

// Deactivate a magic link
async function deactivateMagicLink(id) {
  if (useInMemoryStorage) return true;
  const query = 'UPDATE magic_links SET is_active = false WHERE id = $1 RETURNING *';
  const result = await pool.query(query, [id]);
  return result.rowCount > 0;
}

// Close database connection
async function closeDatabase() {
  if (pool) {
    await pool.end();
    console.log('Database connection closed');
  }
}

// Bulk upsert programs from booking app API
async function upsertPrograms(programs) {
  if (useInMemoryStorage) return [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const results = [];
    for (const p of programs) {
      const query = `
        INSERT INTO programs (program_id, name, description, start_date, end_date, status, color, synced_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        ON CONFLICT (program_id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          status = EXCLUDED.status,
          color = EXCLUDED.color,
          synced_at = CURRENT_TIMESTAMP
        RETURNING *;
      `;
      const values = [
        p.programId || p.program_id,
        p.name,
        p.description || null,
        p.startDate || p.start_date,
        p.endDate || p.end_date,
        p.status || 'PLANNED',
        p.color || 'purple'
      ];
      const result = await client.query(query, values);
      results.push(result.rows[0]);
    }
    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Get all programs
async function getAllPrograms() {
  if (useInMemoryStorage) return [];
  const query = "SELECT * FROM programs WHERE status NOT IN ('COMPLETED', 'ARCHIVED') ORDER BY start_date ASC";
  const result = await pool.query(query);
  return result.rows;
}

// Get active/planned programs that haven't ended
async function getActivePrograms() {
  if (useInMemoryStorage) return [];
  const query = `
    SELECT * FROM programs
    WHERE (status = 'ACTIVE' OR status = 'PLANNED')
    AND end_date >= CURRENT_DATE
    ORDER BY start_date
  `;
  const result = await pool.query(query);
  return result.rows;
}

// Get a single program by ID
async function getProgramById(programId) {
  if (useInMemoryStorage) return null;
  const query = 'SELECT * FROM programs WHERE program_id = $1';
  const result = await pool.query(query, [programId]);
  return result.rows[0] || null;
}

// Get submissions filtered by program
async function getSubmissionsByProgram(programId) {
  if (useInMemoryStorage) return [];
  const query = 'SELECT * FROM talk_submissions WHERE program_id = $1 ORDER BY submitted_at DESC';
  const result = await pool.query(query, [programId]);
  return result.rows;
}

// Get scheduled talks filtered by program
async function getScheduledTalksByProgram(programId) {
  if (useInMemoryStorage) return [];
  const query = `
    SELECT
      st.*,
      ts.first_name, ts.last_name, ts.email, ts.talk_title,
      ts.talk_abstract, ts.affiliation, ts.questions,
      r.name as room_name, r.building as room_building
    FROM scheduled_talks st
    LEFT JOIN talk_submissions ts ON st.submission_id = ts.id
    LEFT JOIN rooms r ON st.room_id = r.id
    WHERE st.program_id = $1
    ORDER BY st.start_time
  `;
  const result = await pool.query(query, [programId]);
  return result.rows;
}

// Bulk upsert workshops from booking app API
async function upsertWorkshops(workshops) {
  if (useInMemoryStorage) return [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const results = [];
    for (const w of workshops) {
      const query = `
        INSERT INTO workshops (workshop_id, program_id, name, description, start_date, end_date, color, synced_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        ON CONFLICT (workshop_id) DO UPDATE SET
          program_id = EXCLUDED.program_id,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          color = EXCLUDED.color,
          synced_at = CURRENT_TIMESTAMP
        RETURNING *;
      `;
      const values = [
        w.eventId || w.event_id || w.workshopId || w.workshop_id,
        w.programId || w.program_id || null,
        w.name,
        w.description || null,
        w.startDate || w.start_date,
        w.endDate || w.end_date,
        w.color || '#969696'
      ];
      const result = await client.query(query, values);
      results.push(result.rows[0]);
    }
    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Get workshops filtered by program
async function getWorkshopsByProgram(programId) {
  if (useInMemoryStorage) return [];
  const query = 'SELECT * FROM workshops WHERE program_id = $1 ORDER BY start_date ASC';
  const result = await pool.query(query, [programId]);
  return result.rows;
}

// Get a single workshop by ID
async function getWorkshopById(workshopId) {
  if (useInMemoryStorage) return null;
  const query = 'SELECT * FROM workshops WHERE workshop_id = $1';
  const result = await pool.query(query, [workshopId]);
  return result.rows[0] || null;
}

// Get submissions filtered by workshop
async function getSubmissionsByWorkshop(workshopId) {
  if (useInMemoryStorage) return [];
  const query = 'SELECT * FROM talk_submissions WHERE workshop_id = $1 ORDER BY submitted_at DESC';
  const result = await pool.query(query, [workshopId]);
  return result.rows;
}

// Get scheduled talks filtered by workshop
async function getScheduledTalksByWorkshop(workshopId) {
  if (useInMemoryStorage) return [];
  const query = `
    SELECT
      st.*,
      ts.first_name, ts.last_name, ts.email, ts.talk_title,
      ts.talk_abstract, ts.affiliation, ts.questions,
      r.name as room_name, r.building as room_building
    FROM scheduled_talks st
    LEFT JOIN talk_submissions ts ON st.submission_id = ts.id
    LEFT JOIN rooms r ON st.room_id = r.id
    WHERE st.workshop_id = $1
    ORDER BY st.start_time
  `;
  const result = await pool.query(query, [workshopId]);
  return result.rows;
}

module.exports = {
  initDatabase,
  insertTalkSubmission,
  getAllTalkSubmissions,
  getTalkSubmissionById,
  deleteTalkSubmission,
  getAllRooms,
  getAllScheduledTalks,
  getScheduledTalkById,
  createScheduledTalk,
  createScheduledTalksInBatch,
  updateScheduledTalk,
  deleteScheduledTalk,
  deleteByRepeatGroup,
  updateByRepeatGroup,
  isRepeatGroupLocked,
  checkSchedulingConflicts,
  createMagicLink,
  validateMagicLink,
  getAllMagicLinks,
  deactivateMagicLink,
  closeDatabase,
  upsertPrograms,
  getAllPrograms,
  getActivePrograms,
  getProgramById,
  getSubmissionsByProgram,
  getScheduledTalksByProgram,
  upsertWorkshops,
  getWorkshopsByProgram,
  getWorkshopById,
  getSubmissionsByWorkshop,
  getScheduledTalksByWorkshop
};
