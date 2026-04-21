import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { auth } from '../middleware/auth';
import * as clientController from '../controllers/client.controller';

const router = Router();

router.use(auth);

const createValidation = validate([
  body('name').trim().notEmpty().withMessage('Client name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').optional().isString(),
  body('address').optional().isString(),
  body('city').optional().isString(),
  body('country').optional().isString(),
]);

const updateValidation = validate([
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').optional().isString(),
  body('address').optional().isString(),
  body('city').optional().isString(),
  body('country').optional().isString(),
]);

router.get('/', clientController.list);
router.post('/', createValidation, clientController.create);
router.get('/:id', clientController.getById);
router.put('/:id', updateValidation, clientController.update);
router.delete('/:id', clientController.remove);

export default router;
