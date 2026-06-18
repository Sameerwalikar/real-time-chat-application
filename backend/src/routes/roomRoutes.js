import express from 'express';
import { getRooms, createGroupRoom, getOrCreateDM, getAllUsers, joinGroupByCode } from '../controllers/roomController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getRooms);
router.post('/group', protect, createGroupRoom);
router.post('/dm', protect, getOrCreateDM);
router.post('/join', protect, joinGroupByCode);
router.get('/users', protect, getAllUsers);

export default router;
