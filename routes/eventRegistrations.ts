import { Router } from 'express';
import EventRegistration from '../models/EventRegistration';
import Student from '../models/Student';
import { sendEventConfirmation } from '../services/email';
import { verifyToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/event-registrations (Admin only)
router.post('/', verifyToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { studentId, events } = req.body;

    if (!studentId || !events || !events.length) {
      return res.status(400).json({ success: false, error: 'Student ID and events are required' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    // Calculate total amount from provided events
    const totalAmount = events.reduce((sum: number, ev: any) => sum + (Number(ev.amount) || 0), 0);

    const registration = new EventRegistration({
      studentId: student._id,
      studentName: student.fullName,
      rollNo: student.rollNo,
      events,
      totalAmount,
      processedBy: req.user.id,
    });

    await registration.save();

    // Mark student as processed
    student.tokenUsed = true;
    student.status = 'processed';
    await student.save();

    // Send email confirmation
    sendEventConfirmation(student.email, student.fullName, events, totalAmount)
      .then(() => {
        registration.emailSent = true;
        registration.save();
      })
      .catch((err) => console.error('Failed to send event confirmation email', err));

    res.status(201).json({ success: true, registration });
  } catch (error) {
    next(error);
  }
});

// GET /api/event-registrations (Admin/Superadmin)
router.get('/', verifyToken, requireAdmin, async (req, res, next) => {
  try {
    const registrations = await EventRegistration.find()
      .populate('processedBy', 'name email')
      .sort({ processedAt: -1 });
    res.json({ success: true, registrations });
  } catch (error) {
    next(error);
  }
});

// GET /api/event-registrations/student/:studentId
router.get('/student/:studentId', verifyToken, requireAdmin, async (req, res, next) => {
  try {
    const registrations = await EventRegistration.find({ studentId: req.params.studentId })
      .populate('processedBy', 'name');
    res.json({ success: true, registrations });
  } catch (error) {
    next(error);
  }
});

export default router;
