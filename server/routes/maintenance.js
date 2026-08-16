import express from 'express';
import mongoose from 'mongoose'; 
import Vehicle from '../models/Vehicle.js';
import { isDbConnected, getVehicles, updateVehicle } from '../memoryDb.js';

const router = express.Router();

const findRecord = (records, recordId) => {
  if (!records || !recordId || recordId === 'new') return null;
  if (mongoose.Types.ObjectId.isValid(recordId) && typeof records.id === 'function') {
    return records.id(recordId);
  }
  return records.find(r => String(r._id || r.id) === String(recordId));
};

// Get all maintenance records or vehicles needing service
router.get('/', async (req, res) => {
  try {
    const vehicles = isDbConnected() ? await Vehicle.find() : getVehicles();
    
    // Process vehicles to return service needed, under maintenance, and history
    let serviceNeeded = [];
    let underMaintenance = [];
    let serviceHistory = [];
    
    vehicles.forEach(vehicle => {
      const vData = {
        vehicleId: vehicle.vehicleId,
        name: vehicle.name,
        regNumber: vehicle.regNumber,
        category: vehicle.category,
        meterReading: vehicle.meterReading || 0,
        lastServiceKm: vehicle.lastServiceKm || 0,
        nextServiceKm: vehicle.nextServiceKm || 5000,
        status: vehicle.status
      };

      if (vehicle.status === 'Maintenance') {
        // Find the active In Progress record
        const activeRecord = vehicle.maintenanceRecords?.find(r => r.status === 'In Progress');
        underMaintenance.push({ ...vData, activeRecord });
      } else {
        // Check if service is needed
        const hasPending = vehicle.maintenanceRecords?.find(r => r.status === 'Pending');
        const isKmDue = vehicle.meterReading >= (vehicle.nextServiceKm || 5000);
        
        if (hasPending || isKmDue) {
          serviceNeeded.push({ ...vData, pendingRecord: hasPending, isKmDue });
        }
      }

      // Add completed records to history
      const completed = vehicle.maintenanceRecords?.filter(r => r.status === 'Completed') || [];
      completed.forEach(record => {
        serviceHistory.push({ ...vData, record });
      });
    });

    // Sort history newest first
    serviceHistory.sort((a, b) => new Date(b.record.completedAt || b.record.serviceDate) - new Date(a.record.completedAt || a.record.serviceDate));

    res.json({ serviceNeeded, underMaintenance, serviceHistory });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add Manual Maintenance Requirement
router.post('/:vehicleId', async (req, res) => {
  try {
    const vehicle = isDbConnected() 
      ? await Vehicle.findOne({ vehicleId: req.params.vehicleId })
      : getVehicles().find(v => v.vehicleId === req.params.vehicleId);

    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const newRecord = {
      status: 'Pending',
      issue: req.body.issue,
      priority: req.body.priority || 'Medium',
      workDone: req.body.workDone, // initially service required
      notes: req.body.notes,
      createdBy: req.body.workerId || 'System',
      createdAt: new Date(),
      serviceKm: vehicle.meterReading
    };

    if (isDbConnected()) {
      vehicle.maintenanceRecords.push(newRecord);
      await vehicle.save();
      return res.json(vehicle);
    } else {
      const records = [...(vehicle.maintenanceRecords || []), newRecord];
      const updated = updateVehicle(vehicle.vehicleId, { maintenanceRecords: records });
      res.json(updated);
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Stop Vehicle for Maintenance
router.patch('/:vehicleId/:recordId/stop', async (req, res) => {
  try {
    const vehicle = isDbConnected() 
      ? await Vehicle.findOne({ vehicleId: req.params.vehicleId })
      : getVehicles().find(v => v.vehicleId === req.params.vehicleId);

    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    if (isDbConnected()) {
      vehicle.status = 'Maintenance';
      vehicle.availability = {
        availableForBooking: false,
        reason: 'Maintenance'
      };
      
      let record = findRecord(vehicle.maintenanceRecords, req.params.recordId);
      if (record && record.status === 'Pending') {
        record.status = 'In Progress';
      } else if (!record && req.params.recordId === 'new') {
        // Create an implicit In Progress record if stopped without prior pending
        vehicle.maintenanceRecords.push({
          status: 'In Progress',
          issue: 'Routine Service / Admin Stopped',
          createdBy: req.body.workerId || 'System',
          createdAt: new Date(),
          serviceKm: vehicle.meterReading
        });
      }
      
      vehicle.auditLogs.push({
        employee: req.body.workerId || 'System',
        action: `Stopped vehicle for maintenance at ${vehicle.meterReading} KM`,
        timestamp: new Date()
      });

      await vehicle.save();
      return res.json(vehicle);
    } else {
      // memoryDb fallback
      let records = [...(vehicle.maintenanceRecords || [])];
      let record = records.find(r => r._id === req.params.recordId || (r.id && r.id === req.params.recordId));
      if (record && record.status === 'Pending') {
        record.status = 'In Progress';
      } else if (!record && req.params.recordId === 'new') {
         records.push({
           id: Date.now().toString(),
           status: 'In Progress',
           issue: 'Routine Service / Admin Stopped',
           createdBy: req.body.workerId || 'System',
           createdAt: new Date(),
           serviceKm: vehicle.meterReading
         });
      }
      const audits = [...(vehicle.auditLogs || []), {
        employee: req.body.workerId || 'System',
        action: `Stopped vehicle for maintenance at ${vehicle.meterReading} KM`,
        timestamp: new Date()
      }];
      
      const updated = updateVehicle(vehicle.vehicleId, {
        status: 'Maintenance',
        availability: { availableForBooking: false, reason: 'Maintenance' },
        maintenanceRecords: records,
        auditLogs: audits
      });
      res.json(updated);
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update Status (Intermediate)
router.patch('/:vehicleId/:recordId/status', async (req, res) => {
  try {
    const { statusNotes } = req.body;
    const vehicle = isDbConnected() 
      ? await Vehicle.findOne({ vehicleId: req.params.vehicleId })
      : getVehicles().find(v => v.vehicleId === req.params.vehicleId);

    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    if (isDbConnected()) {
      let record = findRecord(vehicle.maintenanceRecords, req.params.recordId);
      if (record) {
        if (statusNotes) record.notes = (record.notes ? record.notes + '\n' : '') + `[${new Date().toLocaleDateString()}] ${statusNotes}`;
        await vehicle.save();
      }
      return res.json(vehicle);
    } else {
      let records = [...(vehicle.maintenanceRecords || [])];
      let record = records.find(r => r._id === req.params.recordId || (r.id && r.id === req.params.recordId));
      if (record && statusNotes) {
        record.notes = (record.notes ? record.notes + '\n' : '') + `[${new Date().toLocaleDateString()}] ${statusNotes}`;
      }
      const updated = updateVehicle(vehicle.vehicleId, { maintenanceRecords: records });
      res.json(updated);
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Complete Service
router.post('/:vehicleId/:recordId/complete', async (req, res) => {
  try {
    const { serviceDate, serviceKm, workDone, vendor, cost, notes, workerId } = req.body;
    const vehicle = isDbConnected() 
      ? await Vehicle.findOne({ vehicleId: req.params.vehicleId })
      : getVehicles().find(v => v.vehicleId === req.params.vehicleId);

    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const currentInterval = vehicle.maintenanceIntervalKm || 5000;
    const sKm = Number(serviceKm) || vehicle.meterReading;
    const newNextServiceKm = sKm + currentInterval;

    if (isDbConnected()) {
      vehicle.status = 'Available';
      vehicle.availability = {
        availableForBooking: true,
        reason: ''
      };
      vehicle.lastServiceKm = sKm;
      vehicle.nextServiceKm = newNextServiceKm;
      // meter reading might optionally be updated if it wasn't accurate
      if (sKm > (vehicle.meterReading || 0)) {
        vehicle.meterReading = sKm;
      }

      let record = findRecord(vehicle.maintenanceRecords, req.params.recordId);
      if (record) {
        record.status = 'Completed';
        record.serviceDate = serviceDate || new Date();
        record.serviceKm = sKm;
        record.workDone = workDone;
        record.vendor = vendor;
        record.cost = Number(cost) || 0;
        record.notes = notes;
        record.completedBy = workerId || 'System';
        record.completedAt = new Date();
        record.nextServiceKm = newNextServiceKm;
      }
      
      vehicle.auditLogs.push({
        employee: workerId || 'System',
        action: `Completed maintenance. Cost: ${cost}. Next due: ${newNextServiceKm} KM`,
        timestamp: new Date()
      });

      await vehicle.save();
      return res.json(vehicle);
    } else {
      let records = [...(vehicle.maintenanceRecords || [])];
      let record = records.find(r => r._id === req.params.recordId || (r.id && r.id === req.params.recordId));
      if (record) {
        record.status = 'Completed';
        record.serviceDate = serviceDate || new Date();
        record.serviceKm = sKm;
        record.workDone = workDone;
        record.vendor = vendor;
        record.cost = Number(cost) || 0;
        record.notes = notes;
        record.completedBy = workerId || 'System';
        record.completedAt = new Date();
        record.nextServiceKm = newNextServiceKm;
      }

      const audits = [...(vehicle.auditLogs || []), {
        employee: workerId || 'System',
        action: `Completed maintenance. Cost: ${cost}. Next due: ${newNextServiceKm} KM`,
        timestamp: new Date()
      }];

      const updated = updateVehicle(vehicle.vehicleId, {
        status: 'Available',
        availability: { availableForBooking: true, reason: '' },
        lastServiceKm: sKm,
        nextServiceKm: newNextServiceKm,
        meterReading: Math.max(sKm, vehicle.meterReading || 0),
        maintenanceRecords: records,
        auditLogs: audits
      });
      res.json(updated);
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Edit Maintenance History Record
router.put('/:vehicleId/:recordId', async (req, res) => {
  try {
    const { workDone, vendor, cost, serviceKm, notes, serviceDate } = req.body;
    const vehicle = isDbConnected() 
      ? await Vehicle.findOne({ vehicleId: req.params.vehicleId })
      : getVehicles().find(v => v.vehicleId === req.params.vehicleId);

    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    if (isDbConnected()) {
      let record = findRecord(vehicle.maintenanceRecords, req.params.recordId);
      if (record) {
        if (workDone !== undefined) record.workDone = workDone;
        if (vendor !== undefined) record.vendor = vendor;
        if (cost !== undefined) record.cost = Number(cost) || 0;
        if (serviceKm !== undefined) record.serviceKm = Number(serviceKm) || 0;
        if (notes !== undefined) record.notes = notes;
        if (serviceDate !== undefined) record.serviceDate = new Date(serviceDate);
      }
      await vehicle.save();
      return res.json(vehicle);
    } else {
      let records = [...(vehicle.maintenanceRecords || [])];
      let record = records.find(r => String(r._id || r.id) === String(req.params.recordId));
      if (record) {
        if (workDone !== undefined) record.workDone = workDone;
        if (vendor !== undefined) record.vendor = vendor;
        if (cost !== undefined) record.cost = Number(cost) || 0;
        if (serviceKm !== undefined) record.serviceKm = Number(serviceKm) || 0;
        if (notes !== undefined) record.notes = notes;
        if (serviceDate !== undefined) record.serviceDate = new Date(serviceDate);
      }
      const updated = updateVehicle(vehicle.vehicleId, { maintenanceRecords: records });
      res.json(updated);
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete Maintenance History Record
router.delete('/:vehicleId/:recordId', async (req, res) => {
  try {
    const vehicle = isDbConnected() 
      ? await Vehicle.findOne({ vehicleId: req.params.vehicleId })
      : getVehicles().find(v => v.vehicleId === req.params.vehicleId);

    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    if (isDbConnected()) {
      vehicle.maintenanceRecords = vehicle.maintenanceRecords.filter(
        r => String(r._id) !== String(req.params.recordId)
      );
      await vehicle.save();
      return res.json(vehicle);
    } else {
      let records = (vehicle.maintenanceRecords || []).filter(
        r => String(r._id || r.id) !== String(req.params.recordId)
      );
      const updated = updateVehicle(vehicle.vehicleId, { maintenanceRecords: records });
      res.json(updated);
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
