import { Router } from 'express';
import Student from '../models/Student';
import { generate6DigitToken, hashToken } from '../services/tokenService';
import { sendRegistrationToken } from '../services/email';
import { verifyToken, requireAdmin } from '../middleware/auth';

const router = Router();

// POST /api/students/register
router.post('/register', async (req, res, next) => {
  try {
    const { fullName, rollNo, course, section, year, mobileNo, email } = req.body;
    const branch = req.body.branch?.toUpperCase().trim();

    // Basic validation
    if (!fullName || !rollNo || !course || !branch || !section || !year || !mobileNo || !email) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    // Check if email or rollNo already exists
    const existingStudent = await Student.findOne({
      $or: [{ email: email.toLowerCase() }, { rollNo: rollNo.toUpperCase() }],
    });

    if (existingStudent) {
      return res.status(400).json({ success: false, error: 'Student with this email or roll number already registered' });
    }

    const unhashedToken = generate6DigitToken();
    const hashed = await hashToken(unhashedToken);

    const student = new Student({
      fullName,
      rollNo,
      course,
      branch,
      section,
      year,
      mobileNo,
      email,
      tokenHash: hashed,
      token: unhashedToken, // Storing plaintext for easy lookup by admin
    });

    await student.save();

    // Send email (non-blocking but updates status)
    sendRegistrationToken(email, fullName, rollNo, course, branch, section, year, unhashedToken)
      .then(async (success) => {
        if (success) {
          await Student.findByIdAndUpdate(student._id, { emailSent: true });
        }
      });

    res.status(201).json({
      success: true,
      token: unhashedToken,
      studentId: student._id,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/students/resend-failed (Admin only)
router.post('/resend-failed', verifyToken, requireAdmin, async (req, res, next) => {
  try {
    console.log('--- REQ: Bulk Resend Failed Emails');
    const failedStudents = await Student.find({ emailSent: { $ne: true } });
    
    if (failedStudents.length === 0) {
      console.log('--- RES: No failed students found');
      return res.json({ success: true, message: 'No failed emails to resend' });
    }

    console.log(`--- INFO: Resending ${failedStudents.length} emails in background...`);
    // Process in background to avoid timeout
    failedStudents.forEach(async (student) => {
      const success = await sendRegistrationToken(
        student.email, 
        student.fullName, 
        student.rollNo, 
        student.course, 
        student.branch, 
        student.section, 
        student.year, 
        student.token
      );
      if (success) {
        await Student.findByIdAndUpdate(student._id, { emailSent: true });
        console.log(`--- SUCCESS: Resent to ${student.email}`);
      } else {
        console.log(`--- FAILED: Still failing for ${student.email}`);
      }
    });

    res.json({ success: true, message: `Attempting to resend ${failedStudents.length} emails in background` });
  } catch (error) {
    next(error);
  }
});

// POST /api/students/:id/resend (Admin only)
router.post('/:id/resend', verifyToken, requireAdmin, async (req, res, next) => {
  try {
    console.log('--- REQ: Individual Resend for Student ID:', req.params.id);
    const student = await Student.findById(req.params.id);
    if (!student) {
      console.log('--- ERR: Student not found for individual resend');
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const success = await sendRegistrationToken(
      student.email, 
      student.fullName, 
      student.rollNo, 
      student.course, 
      student.branch, 
      student.section, 
      student.year, 
      student.token
    );

    if (success) {
      await Student.findByIdAndUpdate(student._id, { emailSent: true });
      console.log('--- SUCCESS: Individual Resend successful');
      return res.json({ success: true, message: 'Email sent successfully' });
    } else {
      console.log('--- ERR: Individual Resend failed');
      return res.status(500).json({ success: false, error: 'Failed to send email' });
    }
  } catch (error) {
    next(error);
  }
});

// POST /api/students/verify-token (Admin only)
router.post('/verify-token', verifyToken, requireAdmin, async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    // Find student by plain token
    const student = await Student.findOne({ token });
    if (!student) {
      return res.status(404).json({ success: false, error: 'Invalid or incorrect token' });
    }

    res.json({ success: true, student });
  } catch (error) {
    next(error);
  }
});

// GET /api/students (Admin/SuperAdmin)
router.get('/', verifyToken, requireAdmin, async (req, res, next) => {
  try {
    const { search, branch } = req.query;
    let query: any = {};

    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      query.$or = [
        { fullName: searchRegex },
        { rollNo: searchRegex },
        { email: searchRegex },
      ];
    }

    if (branch && branch !== 'All') {
      query.branch = branch;
    }

    const students = await Student.find(query).sort({ registeredAt: -1 });
    res.json({ success: true, students });
  } catch (error) {
    next(error);
  }
});

// GET /api/students/:id (Admin/SuperAdmin)
router.get('/:id', verifyToken, requireAdmin, async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }
    res.json({ success: true, student });
  } catch (error) {
    next(error);
  }
});

// PUT /api/students/:id (Admin/SuperAdmin)
router.put('/:id', verifyToken, requireAdmin, async (req, res, next) => {
  try {
    const { fullName, rollNo, course, branch, section, year, mobileNo, email } = req.body;
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { fullName, rollNo, course, branch, section, year, mobileNo, email },
      { new: true, runValidators: true }
    );
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }
    res.json({ success: true, student });
  } catch (error) {
    next(error);
  }
});

export default router;
