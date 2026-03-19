import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { verifyToken, requireSuperAdmin } from '../middleware/auth';

const router = Router();

// GET /api/users (SuperAdmin only)
router.get('/', verifyToken, requireSuperAdmin, async (req, res, next) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
});

// POST /api/users (SuperAdmin only)
router.post('/', verifyToken, requireSuperAdmin, async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userRole = role === 'superadmin' ? 'superadmin' : 'admin';

    const user = new User({
      name,
      email,
      passwordHash,
      role: userRole,
    });

    await user.save();

    res.status(201).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/users/:id (SuperAdmin only)
router.delete('/:id', verifyToken, requireSuperAdmin, async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, message: 'Admin deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
