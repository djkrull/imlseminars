const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const db = require('../config/database');
const Talk = require('../models/Talk');

// GET /api/scheduling/rooms - Get all rooms
router.get('/rooms', isAuthenticated, async (req, res) => {
  try {
    const rooms = await db.getAllRooms();
    res.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// GET /api/scheduling/submissions - Get all submissions
router.get('/submissions', isAuthenticated, async (req, res) => {
  try {
    const submissions = await Talk.findAll();
    res.json(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// GET /api/scheduling/scheduled - Get all scheduled talks
router.get('/scheduled', isAuthenticated, async (req, res) => {
  try {
    const scheduled = await db.getAllScheduledTalks();
    res.json(scheduled);
  } catch (error) {
    console.error('Error fetching scheduled talks:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled talks' });
  }
});

// GET /api/scheduling/unscheduled - Get unscheduled submissions
router.get('/unscheduled', isAuthenticated, async (req, res) => {
  try {
    const allSubmissions = await Talk.findAll();
    const scheduled = await db.getAllScheduledTalks();
    const scheduledIds = scheduled
      .filter(s => s.submission_id)
      .map(s => s.submission_id);

    const unscheduled = allSubmissions.filter(talk =>
      !scheduledIds.includes(talk.id)
    );

    res.json(unscheduled);
  } catch (error) {
    console.error('Error fetching unscheduled submissions:', error);
    res.status(500).json({ error: 'Failed to fetch unscheduled submissions' });
  }
});

// POST /api/scheduling/schedule - Schedule a talk or create custom event
router.post('/schedule', isAuthenticated, async (req, res) => {
  try {
    const { submission_id, room_id, event_title, event_speaker, event_affiliation,
            event_abstract, start_time, end_time, publish_to_website, notes } = req.body;

    // Validate required fields
    if (!room_id || !start_time || !end_time) {
      return res.status(400).json({ error: 'Room, start time, and end time are required' });
    }

    // Check for conflicts
    const conflicts = await db.checkSchedulingConflicts(room_id, start_time, end_time);
    if (conflicts.length > 0) {
      return res.status(409).json({
        error: 'Scheduling conflict detected',
        conflicts
      });
    }

    const scheduled = await db.createScheduledTalk({
      submission_id,
      room_id,
      event_title,
      event_speaker,
      event_affiliation,
      event_abstract,
      start_time,
      end_time,
      publish_to_website: publish_to_website || false,
      notes
    });

    res.status(201).json(scheduled);
  } catch (error) {
    console.error('Error scheduling talk:', error);
    res.status(500).json({ error: 'Failed to schedule talk' });
  }
});

// PATCH /api/scheduling/schedule/:id - Update scheduled talk
router.patch('/schedule/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { room_id, event_title, event_speaker, event_affiliation, event_abstract,
            start_time, end_time, status, publish_to_website, notes } = req.body;

    // Check for conflicts if time or room changed
    if (room_id || start_time || end_time) {
      const current = await db.getAllScheduledTalks();
      const currentTalk = current.find(t => t.id === parseInt(id));

      const checkRoomId = room_id || currentTalk.room_id;
      const checkStartTime = start_time || currentTalk.start_time;
      const checkEndTime = end_time || currentTalk.end_time;

      const conflicts = await db.checkSchedulingConflicts(
        checkRoomId,
        checkStartTime,
        checkEndTime,
        parseInt(id)
      );

      if (conflicts.length > 0) {
        return res.status(409).json({
          error: 'Scheduling conflict detected',
          conflicts
        });
      }
    }

    const updated = await db.updateScheduledTalk(id, {
      room_id,
      event_title,
      event_speaker,
      event_affiliation,
      event_abstract,
      start_time,
      end_time,
      status,
      publish_to_website,
      notes
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating scheduled talk:', error);
    res.status(500).json({ error: 'Failed to update scheduled talk' });
  }
});

// DELETE /api/scheduling/schedule/:id - Delete scheduled talk
router.delete('/schedule/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const success = await db.deleteScheduledTalk(id);

    if (!success) {
      return res.status(404).json({ error: 'Scheduled talk not found' });
    }

    res.json({ message: 'Scheduled talk deleted successfully' });
  } catch (error) {
    console.error('Error deleting scheduled talk:', error);
    res.status(500).json({ error: 'Failed to delete scheduled talk' });
  }
});

// POST /api/scheduling/check-conflict - Check for conflicts without creating
router.post('/check-conflict', isAuthenticated, async (req, res) => {
  try {
    const { room_id, start_time, end_time, exclude_id } = req.body;

    if (!room_id || !start_time || !end_time) {
      return res.status(400).json({ error: 'Room, start time, and end time are required' });
    }

    const conflicts = await db.checkSchedulingConflicts(
      room_id,
      start_time,
      end_time,
      exclude_id
    );

    res.json({ hasConflict: conflicts.length > 0, conflicts });
  } catch (error) {
    console.error('Error checking conflicts:', error);
    res.status(500).json({ error: 'Failed to check conflicts' });
  }
});

module.exports = router;
