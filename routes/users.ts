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
    const { name, email, password, role, allowedTabs } = req.body;

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
      allowedTabs: allowedTabs || (userRole === 'superadmin' ? ['overview', 'single', 'group', 'students', 'events', 'registrations', 'schedule', 'users'] : ['single', 'group', 'students', 'registrations']),
    });

    await user.save();

    res.status(201).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        allowedTabs: user.allowedTabs,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/:id (SuperAdmin only)
router.put('/:id', verifyToken, requireSuperAdmin, async (req, res, next) => {
  try {
    const { name, email, password, role, allowedTabs } = req.body;
    
    // Find the user first
    const userToUpdate = await User.findById(req.params.id);
    if (!userToUpdate) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check if email is being changed and if it already exists
    if (email && email.toLowerCase() !== userToUpdate.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ success: false, error: 'Email already in use by another user' });
      }
      userToUpdate.email = email.toLowerCase();
    }

    if (name) userToUpdate.name = name;
    if (role) userToUpdate.role = role === 'superadmin' ? 'superadmin' : 'admin';
    if (allowedTabs) userToUpdate.allowedTabs = allowedTabs;
    
    if (password && password.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      userToUpdate.passwordHash = await bcrypt.hash(password, salt);
    }
    
    await userToUpdate.save();
    
    res.json({
      success: true,
      user: {
        _id: userToUpdate._id,
        name: userToUpdate.name,
        email: userToUpdate.email,
        role: userToUpdate.role,
        allowedTabs: userToUpdate.allowedTabs,
      }
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
