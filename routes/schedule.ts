import { Router } from 'express';
import ScheduleEntry from '../models/ScheduleEntry';
import { verifyToken, requireAdmin, requireSuperAdmin } from '../middleware/auth';

const router = Router();

// GET /api/schedule (Public)
router.get('/', async (req, res, next) => {
  try {
    const entries = await ScheduleEntry.find().sort({ day: 1, order: 1, time: 1 });
    res.json({ success: true, entries });
  } catch (error) {
    next(error);
  }
});

// POST /api/schedule (SuperAdmin only)
router.post('/', verifyToken, requireSuperAdmin, async (req, res, next) => {
  try {
    const entry = new ScheduleEntry(req.body);
    await entry.save();
    res.status(201).json({ success: true, entry });
  } catch (error) {
    next(error);
  }
});

// PUT /api/schedule/:id (SuperAdmin only)
router.put('/:id', verifyToken, requireSuperAdmin, async (req, res, next) => {
  try {
    const entry = await ScheduleEntry.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Schedule entry not found' });
    }
    res.json({ success: true, entry });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/schedule/:id (SuperAdmin only)
router.delete('/:id', verifyToken, requireSuperAdmin, async (req, res, next) => {
  try {
    const entry = await ScheduleEntry.findByIdAndDelete(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Schedule entry not found' });
    }
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
