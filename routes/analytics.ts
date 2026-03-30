import { Router } from 'express';
import mongoose from 'mongoose';
import Student from '../models/Student';
import EventRegistration from '../models/EventRegistration';
import { verifyToken, requireSuperAdmin } from '../middleware/auth';

const router = Router();

// GET /api/analytics
router.get('/', verifyToken, async (req, res, next) => {
  try {
    const totalStudents = await Student.countDocuments();
    
    // Processed students are those who have at least one registration
    const registeredStudentIds = await EventRegistration.distinct('studentId');
    const participantIds = await EventRegistration.distinct('participantIds');
    const allUniqueRegisteredIds = new Set([
      ...registeredStudentIds.filter(Boolean).map(id => id.toString()),
      ...participantIds.filter(Boolean).map(id => id.toString())
    ]);
    const processedStudents = allUniqueRegisteredIds.size;
    
    const registrations = await EventRegistration.find().lean();
    
    let totalRevenue = 0;
    const categoryBreakdown: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    const eventBreakdown: Record<string, number> = {};

    registrations.forEach(reg => {
      totalRevenue += reg.totalAmount;
      
      reg.events.forEach(ev => {
        // Category breakdown
        categoryBreakdown[ev.category] = (categoryBreakdown[ev.category] || 0) + ev.amount;
        categoryCounts[ev.category] = (categoryCounts[ev.category] || 0) + 1;
        
        // Event breakdown
        const eventKey = ev.eventName;
        eventBreakdown[eventKey] = (eventBreakdown[eventKey] || 0) + ev.amount;
      });
    });

    // Branch breakdown
    const branchBreakdownRaw = await Student.aggregate([
      {
        $match: {
          _id: { $in: Array.from(allUniqueRegisteredIds).map(id => new mongoose.Types.ObjectId(id)) }
        }
      },
      {
        $group: {
          _id: { branch: '$branch', year: '$year' },
          count: { $sum: 1 }
        }
      }
    ]);

    const branchBreakdown: Record<string, number> = {};
    branchBreakdownRaw.forEach(b => {
      let keyName = b._id?.branch || 'UNKNOWN';
      if (b._id?.year) {
        keyName += ` ${b._id.year}`;
      }
      branchBreakdown[keyName] = b.count;
    });

    res.json({
      success: true,
      stats: {
        totalStudents,
        processedStudents,
        totalRegistrations: registrations.length,
        totalRevenue,
        categoryBreakdown,
        categoryCounts,
        eventBreakdown,
        branchBreakdown
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
