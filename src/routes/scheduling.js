const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../middleware/auth');
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

// GET /api/scheduling/submissions - Get all submissions (optionally filtered by program_id or workshop_id)
router.get('/submissions', isAuthenticated, async (req, res) => {
  try {
    const programId = req.query.program_id;
    const workshopId = req.query.workshop_id;
    let submissions;
    if (workshopId) {
      const rows = await db.getSubmissionsByWorkshop(workshopId);
      submissions = rows.map(r => new Talk(r).toJSON());
    } else if (programId) {
      const rows = await db.getSubmissionsByProgram(programId);
      submissions = rows.map(r => new Talk(r).toJSON());
    } else {
      submissions = await Talk.findAll();
    }
    res.json(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// GET /api/scheduling/scheduled - Get all scheduled talks (optionally filtered by program_id and/or workshop_id)
router.get('/scheduled', isAuthenticated, async (req, res) => {
  try {
    const programId = req.query.program_id;
    const workshopId = req.query.workshop_id;
    const scheduled = await db.getAllScheduledTalks(programId || undefined, workshopId || undefined);
    res.json(scheduled);
  } catch (error) {
    console.error('Error fetching scheduled talks:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled talks' });
  }
});

// GET /api/scheduling/unscheduled - Get unscheduled submissions (optionally filtered by program_id or workshop_id)
router.get('/unscheduled', isAuthenticated, async (req, res) => {
  try {
    const programId = req.query.program_id;
    const workshopId = req.query.workshop_id;
    let allSubmissions;
    if (workshopId) {
      const rows = await db.getSubmissionsByWorkshop(workshopId);
      allSubmissions = rows.map(r => new Talk(r).toJSON());
    } else if (programId) {
      const rows = await db.getSubmissionsByProgram(programId);
      allSubmissions = rows.map(r => new Talk(r).toJSON());
    } else {
      allSubmissions = await Talk.findAll();
    }
    const scheduled = await db.getAllScheduledTalks(programId || undefined, workshopId || undefined);
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
            event_abstract, start_time, end_time, publish_to_website, notes, program_id, workshop_id } = req.body;

    // Validate required fields
    if (!room_id || !start_time || !end_time) {
      return res.status(400).json({ error: 'Room, start time, and end time are required' });
    }

    // Check for conflicts
    const conflicts = await db.checkSchedulingConflicts(room_id, start_time, end_time, null, program_id || null, workshop_id || null);
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
      notes,
      program_id: program_id || null,
      workshop_id: workshop_id || null
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
            start_time, end_time, status, publish_to_website, notes, is_locked } = req.body;

    // Admin-only fields: is_locked, publish_to_website, status
    const isAdminUser = req.session && req.session.isAdmin;
    const adminOnlyFields = ['is_locked', 'publish_to_website', 'status'];
    const attemptedAdminFields = adminOnlyFields.filter(f => req.body[f] !== undefined);
    if (attemptedAdminFields.length > 0 && !isAdminUser) {
      return res.status(403).json({ error: 'Only admins can change publish status, lock, or status' });
    }

    // Lock enforcement: locked items can only have is_locked, publish_to_website, or status changed
    const currentTalk = await db.getScheduledTalkById(id);
    if (!currentTalk) {
      return res.status(404).json({ error: 'Scheduled talk not found' });
    }

    if (currentTalk.is_locked) {
      const lockedAllowedFields = ['is_locked', 'publish_to_website', 'status'];
      const attemptedFields = Object.keys(req.body).filter(k => req.body[k] !== undefined);
      const disallowed = attemptedFields.filter(f => !lockedAllowedFields.includes(f));
      if (disallowed.length > 0) {
        return res.status(403).json({ error: 'This item is locked. Unlock it first to make changes.' });
      }
    }

    // Check for conflicts if time or room changed
    if (room_id || start_time || end_time) {
      const checkRoomId = room_id || currentTalk.room_id;
      const checkStartTime = start_time || currentTalk.start_time;
      const checkEndTime = end_time || currentTalk.end_time;

      if (checkRoomId) {
        const conflicts = await db.checkSchedulingConflicts(
          checkRoomId,
          checkStartTime,
          checkEndTime,
          parseInt(id),
          currentTalk.program_id || null,
          currentTalk.workshop_id || null
        );

        if (conflicts.length > 0) {
          return res.status(409).json({
            error: 'Scheduling conflict detected',
            conflicts
          });
        }
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
      notes,
      is_locked
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating scheduled talk:', error);
    res.status(500).json({ error: 'Failed to update scheduled talk' });
  }
});

// PATCH /api/scheduling/schedule/:id/lock - Toggle lock on a single item (admin only)
router.patch('/schedule/:id/lock', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_locked } = req.body;

    if (typeof is_locked !== 'boolean') {
      return res.status(400).json({ error: 'is_locked must be a boolean' });
    }

    const updated = await db.updateScheduledTalk(id, { is_locked });
    if (!updated) {
      return res.status(404).json({ error: 'Scheduled talk not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error toggling lock:', error);
    res.status(500).json({ error: 'Failed to toggle lock' });
  }
});

// DELETE /api/scheduling/schedule/:id - Delete scheduled talk
router.delete('/schedule/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    // Lock enforcement
    const talk = await db.getScheduledTalkById(id);
    if (!talk) {
      return res.status(404).json({ error: 'Scheduled talk not found' });
    }
    if (talk.is_locked) {
      return res.status(403).json({ error: 'This item is locked and cannot be deleted. Unlock it first.' });
    }

    const success = await db.deleteScheduledTalk(id);
    res.json({ message: 'Scheduled talk deleted successfully' });
  } catch (error) {
    console.error('Error deleting scheduled talk:', error);
    res.status(500).json({ error: 'Failed to delete scheduled talk' });
  }
});

// POST /api/scheduling/blocks - Create a scheduling block (single or repeating)
router.post('/blocks', isAuthenticated, async (req, res) => {
  try {
    const { event_title, room_id, start_time, end_time, is_locked, notes, repeat, program_id, workshop_id } = req.body;

    if (!event_title || !start_time || !end_time) {
      return res.status(400).json({ error: 'Title, start time, and end time are required' });
    }

    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    const startTimeOfDay = start_time.includes('T') ? start_time.split('T')[1] : '00:00';
    const endTimeOfDay = end_time.includes('T') ? end_time.split('T')[1] : '00:00';

    if (!repeat) {
      // Single block
      if (room_id) {
        const conflicts = await db.checkSchedulingConflicts(room_id, start_time, end_time, null, program_id || null, workshop_id || null);
        if (conflicts.length > 0) {
          return res.status(409).json({ error: 'Scheduling conflict detected', conflicts });
        }
      }

      const block = await db.createScheduledTalk({
        room_id: room_id || null,
        event_title,
        start_time,
        end_time,
        is_locked: is_locked !== undefined ? is_locked : true,
        is_block: true,
        notes,
        program_id: program_id || null,
        workshop_id: workshop_id || null
      });

      return res.status(201).json(block);
    }

    // Repeating block
    const { pattern, days, until } = repeat;
    if (!until) {
      return res.status(400).json({ error: 'Repeat until date is required' });
    }

    const untilDate = new Date(until);
    untilDate.setHours(23, 59, 59);
    const repeatGroupId = crypto.randomUUID();

    // Generate dates based on pattern
    const dates = [];
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);

    while (current <= untilDate) {
      const dayOfWeek = current.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      let include = false;

      switch (pattern) {
        case 'daily':
          include = true;
          break;
        case 'weekdays':
          include = dayOfWeek >= 1 && dayOfWeek <= 5;
          break;
        case 'weekly':
          include = dayOfWeek === startDate.getDay();
          break;
        case 'custom':
          include = Array.isArray(days) && days.includes(dayOfWeek);
          break;
      }

      if (include) {
        dates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }

    if (dates.length === 0) {
      return res.status(400).json({ error: 'No matching dates found for the repeat pattern' });
    }

    // Check conflicts for all dates if room specified
    if (room_id) {
      for (const date of dates) {
        const dateStr = date.toISOString().split('T')[0];
        const slotStart = `${dateStr}T${startTimeOfDay}`;
        const slotEnd = `${dateStr}T${endTimeOfDay}`;
        const conflicts = await db.checkSchedulingConflicts(room_id, slotStart, slotEnd, null, program_id || null, workshop_id || null);
        if (conflicts.length > 0) {
          return res.status(409).json({
            error: `Scheduling conflict on ${dateStr}`,
            conflicts
          });
        }
      }
    }

    // Create all instances
    const items = dates.map(date => {
      const dateStr = date.toISOString().split('T')[0];
      return {
        room_id: room_id || null,
        event_title,
        start_time: `${dateStr}T${startTimeOfDay}`,
        end_time: `${dateStr}T${endTimeOfDay}`,
        is_locked: is_locked !== undefined ? is_locked : true,
        is_block: true,
        repeat_group_id: repeatGroupId,
        notes,
        program_id: program_id || null,
        workshop_id: workshop_id || null
      };
    });

    const blocks = await db.createScheduledTalksInBatch(items);
    res.status(201).json({ repeat_group_id: repeatGroupId, count: blocks.length, blocks });
  } catch (error) {
    console.error('Error creating block:', error);
    res.status(500).json({ error: 'Failed to create block' });
  }
});

// PATCH /api/scheduling/blocks/group/:groupId - Update all instances in a repeat group
router.patch('/blocks/group/:groupId', isAuthenticated, async (req, res) => {
  try {
    const { groupId } = req.params;
    const data = req.body;

    const updated = await db.updateByRepeatGroup(groupId, data);
    if (updated.length === 0) {
      return res.status(404).json({ error: 'Repeat group not found' });
    }

    res.json({ count: updated.length, updated });
  } catch (error) {
    console.error('Error updating repeat group:', error);
    res.status(500).json({ error: 'Failed to update repeat group' });
  }
});

// DELETE /api/scheduling/blocks/group/:groupId - Delete all instances in a repeat group
router.delete('/blocks/group/:groupId', isAuthenticated, async (req, res) => {
  try {
    const { groupId } = req.params;
    const force = req.query.force === 'true';

    if (!force) {
      const locked = await db.isRepeatGroupLocked(groupId);
      if (locked) {
        return res.status(403).json({
          error: 'Some items in this series are locked. Use ?force=true to delete anyway.'
        });
      }
    }

    const success = await db.deleteByRepeatGroup(groupId);
    if (!success) {
      return res.status(404).json({ error: 'Repeat group not found' });
    }

    res.json({ message: 'Repeat group deleted successfully' });
  } catch (error) {
    console.error('Error deleting repeat group:', error);
    res.status(500).json({ error: 'Failed to delete repeat group' });
  }
});

// POST /api/scheduling/check-conflict - Check for conflicts without creating
router.post('/check-conflict', isAuthenticated, async (req, res) => {
  try {
    const { room_id, start_time, end_time, exclude_id, program_id, workshop_id } = req.body;

    if (!room_id || !start_time || !end_time) {
      return res.status(400).json({ error: 'Room, start time, and end time are required' });
    }

    const conflicts = await db.checkSchedulingConflicts(
      room_id,
      start_time,
      end_time,
      exclude_id,
      program_id,
      workshop_id
    );

    res.json({ hasConflict: conflicts.length > 0, conflicts });
  } catch (error) {
    console.error('Error checking conflicts:', error);
    res.status(500).json({ error: 'Failed to check conflicts' });
  }
});

module.exports = router;
