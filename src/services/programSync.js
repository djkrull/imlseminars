const db = require('../config/database');

const BOOKING_APP_URL = process.env.BOOKING_APP_URL || 'https://imlbooking.up.railway.app';

async function syncPrograms() {
  try {
    const response = await fetch(`${BOOKING_APP_URL}/api/programs?limit=50`);
    if (!response.ok) {
      console.warn(`Program sync failed: ${response.status} ${response.statusText}`);
      return 0;
    }
    const programs = await response.json();
    // The booking app returns an array directly (or may have pagination wrapper)
    const programList = Array.isArray(programs) ? programs : (programs.data || []);

    if (programList.length === 0) {
      console.log('Program sync: No programs found');
      return 0;
    }

    await db.upsertPrograms(programList);
    console.log(`Program sync: ${programList.length} programs synced`);
    return programList.length;
  } catch (error) {
    console.warn('Program sync failed:', error.message);
    return 0;
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
