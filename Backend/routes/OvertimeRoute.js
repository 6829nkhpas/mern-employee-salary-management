import express from 'express';
import { adminOnly, verifyUser } from '../middleware/AuthUser.js';
import { createOvertime, getOvertimeValidationContext } from '../controllers/OvertimeController.js';
import { validateOvertimePayload } from '../middleware/ValidateOvertime.js';

const router = express.Router();

router.get('/check', verifyUser, adminOnly, getOvertimeValidationContext);
router.post('/', verifyUser, adminOnly, validateOvertimePayload, createOvertime);

export default router;
