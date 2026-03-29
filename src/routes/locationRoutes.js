import { Router } from 'express';
import {
  listLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} from '../controllers/locationController.js';
import { authenticate, requireSuperAdmin, loadUser } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, loadUser, listLocations);
router.post('/', authenticate, loadUser, requireSuperAdmin, createLocation);
router.patch('/:id', authenticate, loadUser, requireSuperAdmin, updateLocation);
router.delete('/:id', authenticate, loadUser, requireSuperAdmin, deleteLocation);

export default router;
