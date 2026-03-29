import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Location } from '../models/Location.js';

export async function listAdmins(req, res, next) {
  try {
    const users = await User.find({ role: 'admin' })
      .select('-passwordHash')
      .populate('location', 'name code')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ users });
  } catch (e) {
    next(e);
  }
}

export async function createAdmin(req, res, next) {
  try {
    const { name, email, password, locationId } = req.body;
    if (!name?.trim() || !email?.trim() || !password || password.length < 8) {
      return res.status(400).json({
        message: 'Name, email, and password (min 8 characters) are required',
      });
    }
    if (!locationId) {
      return res.status(400).json({ message: 'Location is required for registrar accounts' });
    }
    const loc = await Location.findOne({ _id: locationId, isActive: true });
    if (!loc) {
      return res.status(400).json({ message: 'Invalid or inactive location' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: 'admin',
      location: locationId,
    });
    const populated = await User.findById(user._id)
      .select('-passwordHash')
      .populate('location', 'name code');
    res.status(201).json({ user: populated });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    next(e);
  }
}

export async function updateAdmin(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email, locationId, password, isActive } = req.body;
    const user = await User.findOne({ _id: id, role: 'admin' });
    if (!user) return res.status(404).json({ message: 'Admin not found' });
    if (name != null) user.name = String(name).trim();
    if (email != null) user.email = String(email).toLowerCase().trim();
    if (locationId != null) {
      const loc = await Location.findOne({ _id: locationId, isActive: true });
      if (!loc) return res.status(400).json({ message: 'Invalid or inactive location' });
      user.location = locationId;
    }
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters' });
      }
      user.passwordHash = await bcrypt.hash(password, 12);
    }
    await user.save();
    const populated = await User.findById(user._id)
      .select('-passwordHash')
      .populate('location', 'name code');
    res.json({ user: populated });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    next(e);
  }
}

export async function deleteAdmin(req, res, next) {
  try {
    const { id } = req.params;
    const user = await User.findOneAndUpdate(
      { _id: id, role: 'admin' },
      { isActive: false },
      { new: true }
    )
      .select('-passwordHash')
      .populate('location', 'name code');
    if (!user) return res.status(404).json({ message: 'Admin not found' });
    res.json({ message: 'Admin deactivated', user });
  } catch (e) {
    next(e);
  }
}
