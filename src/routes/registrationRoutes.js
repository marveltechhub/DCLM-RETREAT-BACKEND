import { Router } from 'express';
import multer from 'multer';
import {
  createRegistration,
  listRegistrations,
  getRegistration,
  updateRegistration,
  deleteRegistration,
  exportExcel,
  stats,
} from '../controllers/registrationController.js';
import { authenticate, requireAdminOrSuper, loadUser } from '../middleware/auth.js';
import { uploadProfile, UPLOAD_ERROR_MAP } from '../middleware/upload.js';

const router = Router();

function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    const msg = UPLOAD_ERROR_MAP[err.code] || err.message;
    return res.status(400).json({ message: msg });
  }
  if (err?.status) {
    return res.status(err.status).json({ message: err.message });
  }
  next(err);
}

router.get('/stats', authenticate, loadUser, requireAdminOrSuper, stats);
router.get('/export', authenticate, loadUser, requireAdminOrSuper, exportExcel);
router.get('/', authenticate, loadUser, requireAdminOrSuper, listRegistrations);
router.get('/:id', authenticate, loadUser, requireAdminOrSuper, getRegistration);
router.post(
  '/',
  authenticate,
  loadUser,
  requireAdminOrSuper,
  uploadProfile.single('profilePicture'),
  handleUploadError,
  createRegistration
);
router.patch(
  '/:id',
  authenticate,
  loadUser,
  requireAdminOrSuper,
  uploadProfile.single('profilePicture'),
  handleUploadError,
  updateRegistration
);
router.delete('/:id', authenticate, loadUser, requireAdminOrSuper, deleteRegistration);

export default router;
