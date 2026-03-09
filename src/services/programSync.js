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

module.exports = { syncPrograms };
