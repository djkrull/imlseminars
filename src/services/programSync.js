const db = require('../config/database');

const BOOKING_APP_URL = process.env.BOOKING_APP_URL || 'https://imlbooking.up.railway.app';

const PROGRAM_SYNC_LIMIT = 200;

async function syncPrograms() {
  try {
    const response = await fetch(`${BOOKING_APP_URL}/api/programs?limit=${PROGRAM_SYNC_LIMIT}`);
    if (!response.ok) {
      console.warn(`Program sync failed: ${response.status} ${response.statusText}`);
      return { synced: 0, archived: [] };
    }
    const programs = await response.json();
    // The booking app returns an array directly (or may have pagination wrapper)
    const programList = Array.isArray(programs) ? programs : (programs.data || []);

    if (programList.length === 0) {
      console.log('Program sync: No programs found');
      return { synced: 0, archived: [] };
    }

    await db.upsertPrograms(programList);

    // Archive local programs that are gone from the source (e.g. renamed upstream).
    // Skipped when the response looks truncated — archiving from a partial list
    // would hide legitimate programs.
    let archived = [];
    if (programList.length < PROGRAM_SYNC_LIMIT) {
      archived = await db.archiveProgramsNotIn(programList.map(p => p.programId || p.program_id));
      if (archived.length > 0) {
        console.log(`Program sync: archived ${archived.length} stale programs (${archived.join(', ')})`);
      }
    } else {
      console.warn(`Program sync: received ${programList.length} programs (limit hit) — skipping stale-archive pass`);
    }

    console.log(`Program sync: ${programList.length} programs synced`);
    return { synced: programList.length, archived };
  } catch (error) {
    console.warn('Program sync failed:', error.message);
    return { synced: 0, archived: [] };
  }
}

async function syncWorkshops() {
  try {
    const response = await fetch(`${BOOKING_APP_URL}/api/special-events`);
    if (!response.ok) {
      console.warn(`Workshop sync failed: ${response.status} ${response.statusText}`);
      return 0;
    }
    const events = await response.json();
    const eventList = Array.isArray(events) ? events : (events.data || []);

    // Only sync events that have a programId (workshops belong to programs)
    const workshops = eventList.filter(e => e.programId || e.program_id);

    if (workshops.length === 0) {
      console.log('Workshop sync: No workshops found');
      return 0;
    }

    await db.upsertWorkshops(workshops);
    console.log(`Workshop sync: ${workshops.length} workshops synced`);
    return workshops.length;
  } catch (error) {
    console.warn('Workshop sync failed:', error.message);
    return 0;
  }
}

module.exports = { syncPrograms, syncWorkshops };
