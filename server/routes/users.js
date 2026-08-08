import express from 'express';
import User from '../models/User.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { isDbConnected, getUsers, addUser, updateUser, deleteUser } from '../memoryDb.js';

const router = express.Router();

router.use(protect, adminOnly);

// Create Worker
router.post('/', async (req, res) => {
  try {
    if (isDbConnected()) {
      const user = await User.create(req.body);
      user.password = undefined; // Don't return password
      res.status(201).json(user);
    } else {
      const user = addUser(req.body);
      res.status(201).json(user);
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get all Workers
router.get('/', async (req, res) => {
  try {
    if (isDbConnected()) {
      const users = await User.find({ role: 'worker' }).populate('zoneId');
      res.json(users);
    } else {
      // populate zoneId in memory
      import('../memoryDb.js').then(({ getZones }) => {
        const zones = getZones();
        const users = getUsers().filter(u => u.role === 'worker').map(u => ({
          ...u,
          zoneId: zones.find(z => z._id === u.zoneId) || u.zoneId
        }));
        res.json(users);
      });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Worker
router.put('/:id', async (req, res) => {
  try {
    // If password is included but empty, remove it from update
    if (req.body.password === '') {
      delete req.body.password;
    }
    
    if (isDbConnected()) {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      Object.assign(user, req.body);
      await user.save();
      user.password = undefined;
      res.json(user);
    } else {
      const user = updateUser(req.params.id, req.body);
      if (!user) return res.status(404).json({ message: 'User not found' });
      res.json(user);
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete Worker
router.delete('/:id', async (req, res) => {
  try {
    if (isDbConnected()) {
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      res.json({ message: 'User removed' });
    } else {
      const success = deleteUser(req.params.id);
      if (!success) return res.status(404).json({ message: 'User not found' });
      res.json({ message: 'User removed' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
