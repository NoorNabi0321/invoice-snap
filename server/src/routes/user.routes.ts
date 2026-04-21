import { Router } from 'express';
import { body } from 'express-validator';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as userController from '../controllers/user.controller';

const router = Router();

router.use(auth);

const profileRules = [
  body('business_email')
    .optional({ values: 'falsy' })
    .isEmail().withMessage('Invalid business email'),
  body('currency')
    .optional({ values: 'falsy' })
    .isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter ISO code')
    .isAlpha().withMessage('Currency must contain only letters'),
];

router.put('/profile', validate(profileRules), userController.updateProfile);
router.post('/logo', userController.logoUpload, userController.uploadLogo);

export default router;
