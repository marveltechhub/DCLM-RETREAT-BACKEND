import { Router } from 'express';
import {
  listAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
} from '../controllers/userController.js';
import { authenticate, requireSuperAdmin, loadUser } from '../middleware/auth.js';

const router = Router();

router.get('/admins', authenticate, loadUser, requireSuperAdmin, listAdmins);
router.post('/admins', authenticate, loadUser, requireSuperAdmin, createAdmin);
router.patch('/admins/:id', authenticate, loadUser, requireSuperAdmin, updateAdmin);
router.delete('/admins/:id', authenticate, loadUser, requireSuperAdmin, deleteAdmin);

export default router;
