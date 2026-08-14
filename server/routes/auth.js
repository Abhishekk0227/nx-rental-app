import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { isDbConnected, getUsers, addUser } from '../memoryDb.js';

const router = express.Router();

const generateToken = (id, role, zoneId) => {
  return jwt.sign({ userId: id, role, zoneId }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!isDbConnected()) {
      const user = getUsers().find(u => u.username === username);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      if (user.status !== 'Active') {
        return res.status(403).json({ message: 'Account is inactive' });
      }
      
      const zoneId = user.zoneId || null;
      const token = generateToken(user._id, user.role, zoneId);
      
      return res.json({
        _id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        zone: user.zoneId,
        token,
      });
    }

    const user = await User.findOne({ username }).populate('zoneId');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    if (user.status !== 'Active') {
      return res.status(403).json({ message: 'Account is inactive' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const zoneId = user.zoneId ? user.zoneId._id : null;
    const token = generateToken(user._id, user.role, zoneId);

    res.json({
      _id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
      zone: user.zoneId,
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Create initial admin if none exists (for setup)
router.post('/setup', async (req, res) => {
  try {
    if (!isDbConnected()) {
      const adminExists = getUsers().find(u => u.role === 'admin');
      if (adminExists) {
        return res.status(400).json({ message: 'Admin already exists' });
      }
      const admin = addUser({
        name: 'Super Admin',
        username: 'Rideyourbike@gmail.com',
        password: 'ryb@0001',
        role: 'admin'
      });
      return res.status(201).json({ message: 'Admin setup successful', admin });
    }

    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    const admin = await User.create({
      name: 'Super Admin',
      username: 'Rideyourbike@gmail.com',
      password: 'ryb@0001',
      role: 'admin'
    });

    res.status(201).json({ message: 'Admin setup successful', admin });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
