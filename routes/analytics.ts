import { Router } from 'express';
import Student from '../models/Student';
import EventRegistration from '../models/EventRegistration';
import { verifyToken, requireSuperAdmin } from '../middleware/auth';

const router = Router();

// GET /api/analytics
router.get('/', verifyToken, requireSuperAdmin, async (req, res, next) => {
  try {
    const totalStudents = await Student.countDocuments();
    const processedStudents = await Student.countDocuments({ status: 'processed' });
    
    const registrations = await EventRegistration.find().lean();
    
    let totalRevenue = 0;
    const categoryBreakdown: Record<string, number> = {};
    const eventBreakdown: Record<string, number> = {};

    registrations.forEach(reg => {
      totalRevenue += reg.totalAmount;
      
      reg.events.forEach(ev => {
        // Category breakdown
       categoryBreakdown[ev.category] =
         (categoryBreakdown[ev.category] || 0) + ev.amount;
        
        // Event breakdown
        const eventKey = ev.eventName;
        eventBreakdown[eventKey] = (eventBreakdown[eventKey] || 0) + ev.amount;
      });
    });

    res.json({
      success: true,
      stats: {
        totalStudents,
        processedStudents,
        totalRevenue,
        categoryBreakdown,
        eventBreakdown
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
