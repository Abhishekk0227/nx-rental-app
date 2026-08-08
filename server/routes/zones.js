import express from 'express';
import Zone from '../models/Zone.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { isDbConnected, getZones, addZone, updateZone, deleteZone } from '../memoryDb.js';

const router = express.Router();

// Create Zone
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    if (isDbConnected()) {
      const zone = await Zone.create(req.body);
      res.status(201).json(zone);
    } else {
      const zone = addZone(req.body);
      res.status(201).json(zone);
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get all Zones (Public to workers as they need to filter UI by zones)
router.get('/', protect, async (req, res) => {
  try {
    if (isDbConnected()) {
      const zones = await Zone.find({});
      res.json(zones);
    } else {
      res.json(getZones());
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Zone
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    if (isDbConnected()) {
      const zone = await Zone.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!zone) return res.status(404).json({ message: 'Zone not found' });
      res.json(zone);
    } else {
      const zone = updateZone(req.params.id, req.body);
      if (!zone) return res.status(404).json({ message: 'Zone not found' });
      res.json(zone);
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete Zone
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    if (isDbConnected()) {
      const zone = await Zone.findByIdAndDelete(req.params.id);
      if (!zone) return res.status(404).json({ message: 'Zone not found' });
      res.json({ message: 'Zone removed' });
    } else {
      const success = deleteZone(req.params.id);
      if (!success) return res.status(404).json({ message: 'Zone not found' });
      res.json({ message: 'Zone removed' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
