
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { auth, sign, wrap } from '../middleware/auth.js';
import { META } from '../services/meta.js';

const r = Router();

const safe = (user) => {
  const obj = user.toObject();
  delete obj.passwordHash;
  return obj;
};

// Authentication metadata
r.get('/meta', (req, res) => {
  res.json(META);
});

// Register
r.post(
  '/register',
  wrap(async (req, res) => {
    const { name, email, password, profile = {} } = req.body;

    if (!name || !email || !password || password.length < 6) {
      return res.status(400).json({
        error: 'Name, email and a 6+ char password are required',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'Email already registered',
      });
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 10),
      profile,
    });

    return res.json({
      token: sign(user),
      user: safe(user),
    });
  })
);

// Login
r.post(
  '/login',
  wrap(async (req, res) => {
    console.log('[LOGIN DEBUG] Login route reached');

    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();

    const password = String(req.body?.password || '');

    console.log('[LOGIN DEBUG] Email:', email);
    console.log(
      '[LOGIN DEBUG] Password received:',
      password.length > 0
    );

    const user = await User.findOne({ email });

    console.log('[LOGIN DEBUG] User found:', Boolean(user));

    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    console.log(
      '[LOGIN DEBUG] Password matches:',
      passwordMatches
    );

    if (!passwordMatches) {
      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    return res.json({
      token: sign(user),
      user: safe(user),
    });
  })
);

// List demo accounts
r.get(
  '/demo-accounts',
  wrap(async (req, res) => {
    const users = await User.find({ isDemo: true }).select(
      'name email demoLabel profile'
    );

    res.json(users);
  })
);

// Get current user
r.get('/me', auth, (req, res) => {
  res.json(safe(req.user));
});

// Update profile
r.put(
  '/profile',
  auth,
  wrap(async (req, res) => {
    req.user.profile = {
      ...req.user.profile.toObject(),
      ...req.body,
    };

    await req.user.save();

    res.json(safe(req.user));
  })
);

export default r;