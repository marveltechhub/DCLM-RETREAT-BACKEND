import mongoose from 'mongoose';
import XLSX from 'xlsx';
import { Registration } from '../models/Registration.js';
import { Location } from '../models/Location.js';
import { createRegistrationInTransaction } from '../services/counterService.js';
import { uploadProfileImage } from '../services/cloudinaryService.js';

const CAMP_SLUG = process.env.CAMP_SLUG || 'easter-retreat-2026';

function normalizePhone(p) {
  return String(p || '')
    .replace(/\s+/g, '')
    .trim();
}

function assertLocationAccess(authUser, locationId) {
  if (authUser.role === 'super_admin') return true;
  if (authUser.role === 'admin' && authUser.location?.toString() === locationId) return true;
  return false;
}

export async function createRegistration(req, res, next) {
  try {
    const {
      fullName,
      gender,
      age,
      phone,
      email,
      address,
      locationId,
      nextOfKinName,
      nextOfKinPhone,
    } = req.body;

    const locId = locationId;
    if (!locId || !mongoose.isValidObjectId(locId)) {
      return res.status(400).json({ message: 'Valid location is required' });
    }
    if (!assertLocationAccess(req.authUser, locId)) {
      return res.status(403).json({ message: 'You can only register participants for your assigned location' });
    }

    const loc = await Location.findOne({ _id: locId, isActive: true });
    if (!loc) return res.status(400).json({ message: 'Invalid or inactive location' });

    const phoneNorm = normalizePhone(phone);
    if (!phoneNorm) return res.status(400).json({ message: 'Phone number is required' });

    let emailNorm = null;
    if (email != null && String(email).trim() !== '') {
      emailNorm = String(email).toLowerCase().trim();
    }

    const file = req.file;

    const payloadBase = {
      fullName: String(fullName || '').trim(),
      gender,
      age: Number(age),
      phone: phoneNorm,
      email: emailNorm,
      address: String(address || '').trim(),
      location: locId,
      nextOfKinName: String(nextOfKinName || '').trim(),
      nextOfKinPhone: normalizePhone(nextOfKinPhone),
      profilePictureUrl: '',
      registeredBy: req.userId,
      campSlug: CAMP_SLUG,
    };

    if (!payloadBase.fullName) return res.status(400).json({ message: 'Full name is required' });
    if (!['male', 'female', 'other', 'prefer_not_say'].includes(payloadBase.gender)) {
      return res.status(400).json({ message: 'Valid gender is required' });
    }
    if (!Number.isFinite(payloadBase.age) || payloadBase.age < 1) {
      return res.status(400).json({ message: 'Valid age is required' });
    }
    if (!payloadBase.address) return res.status(400).json({ message: 'Address is required' });
    if (!payloadBase.nextOfKinName || !payloadBase.nextOfKinPhone) {
      return res.status(400).json({ message: 'Next of kin name and phone are required' });
    }

    if (file && (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY)) {
      return res.status(503).json({ message: 'Image upload is not configured on the server' });
    }

    const registration = await createRegistrationInTransaction(async (regNumber, session) => {
      const [doc] = await Registration.create(
        [{ ...payloadBase, registrationNumber: regNumber }],
        { session }
      );
      return doc;
    });

    let profileUrl = '';
    if (file?.buffer) {
      try {
        profileUrl = await uploadProfileImage(file.buffer);
        registration.profilePictureUrl = profileUrl;
        await registration.save();
      } catch (uploadErr) {
        console.error(uploadErr);
        return res.status(500).json({
          message: 'Registration saved but profile picture upload failed',
          registration: formatRegistrationResponse(registration, loc),
        });
      }
    }

    const populated = await Registration.findById(registration._id)
      .populate('location', 'name code')
      .populate('registeredBy', 'name email')
      .lean();

    res.status(201).json({ registration: populated });
  } catch (e) {
    if (e.code === 11000) {
      const key = Object.keys(e.keyPattern || {})[0] || 'field';
      if (key === 'phone') {
        return res.status(409).json({
          message: 'A registration with this phone number already exists for this camp',
        });
      }
      if (key === 'email') {
        return res.status(409).json({
          message: 'A registration with this email already exists for this camp',
        });
      }
      return res.status(409).json({ message: 'Duplicate registration' });
    }
    next(e);
  }
}

function formatRegistrationResponse(reg, loc) {
  return {
    ...reg.toObject?.() || reg,
    location: loc,
  };
}

function buildFilter(authUser, query) {
  const filter = { campSlug: CAMP_SLUG };
  if (authUser.role === 'admin') {
    filter.location = authUser.location;
  }
  if (query.locationId && mongoose.isValidObjectId(query.locationId)) {
    if (authUser.role === 'super_admin') {
      filter.location = query.locationId;
    } else if (authUser.location?.toString() === query.locationId) {
      filter.location = query.locationId;
    }
  }
  if (query.q && String(query.q).trim()) {
    const q = String(query.q).trim();
    filter.$or = [
      { fullName: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      { phone: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      { registrationNumber: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
    ];
  }
  return filter;
}

export async function listRegistrations(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const filter = buildFilter(req.authUser, req.query);

    const [items, total] = await Promise.all([
      Registration.find(filter)
        .populate('location', 'name code')
        .populate('registeredBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Registration.countDocuments(filter),
    ]);

    res.json({
      registrations: items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (e) {
    next(e);
  }
}

export async function stats(req, res, next) {
  try {
    const base = { campSlug: CAMP_SLUG };
    if (req.authUser.role === 'admin') {
      base.location = req.authUser.location;
    }
    const [total, byLocation] = await Promise.all([
      Registration.countDocuments(base),
      Registration.aggregate([
        { $match: base },
        { $group: { _id: '$location', count: { $sum: 1 } } },
      ]),
    ]);
    const locIds = byLocation.map((x) => x._id).filter(Boolean);
    const locs = await Location.find({ _id: { $in: locIds } }).select('name code').lean();
    const locMap = Object.fromEntries(locs.map((l) => [l._id.toString(), l]));
    const perLocation = byLocation.map((row) => ({
      location: locMap[row._id?.toString()] || { name: 'Unknown' },
      count: row.count,
    }));
    res.json({ total, byLocation: perLocation });
  } catch (e) {
    next(e);
  }
}

export async function getRegistration(req, res, next) {
  try {
    const doc = await Registration.findById(req.params.id)
      .populate('location', 'name code')
      .populate('registeredBy', 'name email')
      .lean();
    if (!doc) return res.status(404).json({ message: 'Not found' });
    if (!assertLocationAccess(req.authUser, doc.location._id.toString())) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json({ registration: doc });
  } catch (e) {
    next(e);
  }
}

export async function updateRegistration(req, res, next) {
  try {
    const doc = await Registration.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    if (!assertLocationAccess(req.authUser, doc.location.toString())) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const {
      fullName,
      gender,
      age,
      phone,
      email,
      address,
      locationId,
      nextOfKinName,
      nextOfKinPhone,
    } = req.body;

    if (locationId && locationId !== doc.location.toString()) {
      if (req.authUser.role !== 'super_admin') {
        return res.status(403).json({ message: 'Only super admin can move registrations between locations' });
      }
      const loc = await Location.findOne({ _id: locationId, isActive: true });
      if (!loc) return res.status(400).json({ message: 'Invalid location' });
      doc.location = locationId;
    }

    if (fullName != null) doc.fullName = String(fullName).trim();
    if (gender != null) {
      if (!['male', 'female', 'other', 'prefer_not_say'].includes(gender)) {
        return res.status(400).json({ message: 'Invalid gender' });
      }
      doc.gender = gender;
    }
    if (age != null) {
      const a = Number(age);
      if (!Number.isFinite(a) || a < 1) return res.status(400).json({ message: 'Invalid age' });
      doc.age = a;
    }
    if (phone != null) doc.phone = normalizePhone(phone);
    if (email !== undefined) {
      doc.email = email && String(email).trim() ? String(email).toLowerCase().trim() : null;
    }
    if (address != null) doc.address = String(address).trim();
    if (nextOfKinName != null) doc.nextOfKinName = String(nextOfKinName).trim();
    if (nextOfKinPhone != null) doc.nextOfKinPhone = normalizePhone(nextOfKinPhone);

    const file = req.file;
    if (file?.buffer) {
      if (!process.env.CLOUDINARY_CLOUD_NAME) {
        return res.status(503).json({ message: 'Image upload is not configured' });
      }
      const url = await uploadProfileImage(file.buffer);
      doc.profilePictureUrl = url;
    }

    try {
      await doc.save();
    } catch (e) {
      if (e.code === 11000) {
        return res.status(409).json({ message: 'Phone or email already registered for this camp' });
      }
      throw e;
    }

    const populated = await Registration.findById(doc._id)
      .populate('location', 'name code')
      .populate('registeredBy', 'name email')
      .lean();
    res.json({ registration: populated });
  } catch (e) {
    next(e);
  }
}

export async function deleteRegistration(req, res, next) {
  try {
    const doc = await Registration.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    if (!assertLocationAccess(req.authUser, doc.location.toString())) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await doc.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (e) {
    next(e);
  }
}

export async function exportExcel(req, res, next) {
  try {
    const filter = buildFilter(req.authUser, req.query);
    const rows = await Registration.find(filter)
      .populate('location', 'name code')
      .sort({ registrationNumber: 1 })
      .lean();

    const data = rows.map((r) => ({
      'Registration #': r.registrationNumber,
      'Full Name': r.fullName,
      Gender: r.gender,
      Age: r.age,
      Phone: r.phone,
      Email: r.email || '',
      Address: r.address,
      Location: r.location?.name || '',
      'Location Code': r.location?.code || '',
      'Next of Kin Name': r.nextOfKinName,
      'Next of Kin Phone': r.nextOfKinPhone,
      'Profile URL': r.profilePictureUrl || '',
      Registered: r.createdAt,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registrations');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="dclm-easter-retreat-registrations.xlsx"'
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.send(buf);
  } catch (e) {
    next(e);
  }
}
