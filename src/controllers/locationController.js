import { Location } from '../models/Location.js';

export async function listLocations(req, res, next) {
  try {
    const activeOnly = req.query.active !== 'false';
    const q = activeOnly ? { isActive: true } : {};
    const locations = await Location.find(q).sort({ name: 1 }).lean();
    res.json({ locations });
  } catch (e) {
    next(e);
  }
}

export async function createLocation(req, res, next) {
  try {
    const { name, code, description } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ message: 'Location name is required' });
    }
    const loc = await Location.create({
      name: name.trim(),
      code: (code || '').trim(),
      description: (description || '').trim(),
      createdBy: req.userId,
    });
    res.status(201).json({ location: loc });
  } catch (e) {
    next(e);
  }
}

export async function updateLocation(req, res, next) {
  try {
    const { id } = req.params;
    const { name, code, description, isActive } = req.body;
    const loc = await Location.findById(id);
    if (!loc) return res.status(404).json({ message: 'Location not found' });
    if (name != null) loc.name = String(name).trim();
    if (code != null) loc.code = String(code).trim();
    if (description != null) loc.description = String(description).trim();
    if (typeof isActive === 'boolean') loc.isActive = isActive;
    await loc.save();
    res.json({ location: loc });
  } catch (e) {
    next(e);
  }
}

export async function deleteLocation(req, res, next) {
  try {
    const { id } = req.params;
    const loc = await Location.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    if (!loc) return res.status(404).json({ message: 'Location not found' });
    res.json({ message: 'Location deactivated', location: loc });
  } catch (e) {
    next(e);
  }
}
