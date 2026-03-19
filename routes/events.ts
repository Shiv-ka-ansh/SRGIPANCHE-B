import { Router } from 'express';
import Event from '../models/Event';
import { verifyToken, requireSuperAdmin } from '../middleware/auth';

const router = Router();

// GET /api/events (Public access)
router.get('/', async (req, res, next) => {
  try {
    const events = await Event.find().sort({ category: 1, name: 1 });
    res.json({ success: true, events });
  } catch (error) {
    next(error);
  }
});

// POST /api/events (SuperAdmin only)
router.post('/', verifyToken, requireSuperAdmin, async (req, res, next) => {
  try {
    const { category, name, amount, subEvents, color, description, rules, coordinators } = req.body;
    
    if (!category || !name || !amount || !color) {
      return res.status(400).json({ success: false, error: 'Category, name, amount, and color are required' });
    }

    const event = new Event({ category, name, amount, subEvents, color, description, rules, coordinators });
    await event.save();
    
    res.status(201).json({ success: true, event });
  } catch (error) {
    next(error);
  }
});

// PUT /api/events/:id (SuperAdmin only)
router.put('/:id', verifyToken, requireSuperAdmin, async (req, res, next) => {
  try {
    const { category, name, amount, subEvents, color, description, rules, coordinators } = req.body;
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { category, name, amount, subEvents, color, description, rules, coordinators },
      { new: true, runValidators: true }
    );
    
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    
    res.json({ success: true, event });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/events/:id (SuperAdmin only)
router.delete('/:id', verifyToken, requireSuperAdmin, async (req, res, next) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
