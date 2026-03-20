import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { verifyToken, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    console.time('Login-Process');
    const { email, password } = req.body;
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid email and password are required' });
    }

    console.time('DB-FindUser');
    const user = await User.findOne({ email: email.toLowerCase() });
    console.timeEnd('DB-FindUser');

    if (!user) {
      console.timeEnd('Login-Process');
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    console.time('Bcrypt-Compare');
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    console.timeEnd('Bcrypt-Compare');

    if (!isMatch) {
      console.timeEnd('Login-Process');
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    console.time('JWT-Sign');
    const payload = {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', {
      expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any,
    });
    console.timeEnd('JWT-Sign');

    console.timeEnd('Login-Process');
    return res.json({
      success: true,
      token,
      user: payload,
    });
  } catch (error) {
    console.timeEnd('Login-Process');
    next(error);
  }
});

// POST /api/auth/verify
router.post('/verify', verifyToken, (req: AuthRequest, res) => {
  // If middleware passes, token is valid
  res.json({
    success: true,
    valid: true,
    user: req.user,
  });
});

export default router;
