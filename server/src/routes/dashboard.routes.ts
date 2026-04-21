import { Router } from 'express';
import { auth } from '../middleware/auth';
import * as dashboardController from '../controllers/dashboard.controller';

const router = Router();

router.use(auth);

router.get('/stats', dashboardController.stats);
router.get('/chart', dashboardController.chart);

export default router;
