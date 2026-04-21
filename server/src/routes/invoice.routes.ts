import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { auth } from '../middleware/auth';
import * as invoiceController from '../controllers/invoice.controller';

const router = Router();

router.use(auth);

const invoiceBodyRules = [
  body('client_id').notEmpty().withMessage('client_id required'),
  body('issue_date').isISO8601().withMessage('Valid issue_date required'),
  body('due_date')
    .isISO8601().withMessage('Valid due_date required')
    .custom((val, { req }) => {
      if (val < (req.body as Record<string, string>)['issue_date']) {
        throw new Error('due_date must be on or after issue_date');
      }
      return true;
    }),
  body('tax_rate')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('tax_rate must be between 0 and 100'),
  body('discount_amount')
    .optional()
    .isInt({ min: 0 }).withMessage('discount_amount must be a non-negative integer'),
  body('items').isArray({ min: 1 }).withMessage('At least one line item required'),
  body('items.*.description').trim().notEmpty().withMessage('Item description required'),
  body('items.*.quantity')
    .isFloat({ min: 0.01 }).withMessage('Item quantity must be greater than 0'),
  body('items.*.rate')
    .isInt({ min: 0 }).withMessage('Item rate must be a non-negative number'),
];

router.get('/', invoiceController.list);
router.post('/', validate(invoiceBodyRules), invoiceController.create);
router.get('/:id', invoiceController.getById);
router.put('/:id', validate(invoiceBodyRules), invoiceController.update);
router.delete('/:id', invoiceController.remove);
router.patch(
  '/:id/status',
  validate([body('status').notEmpty().withMessage('status required')]),
  invoiceController.updateStatus
);
router.get('/:id/pdf', invoiceController.downloadPdf);

export default router;
