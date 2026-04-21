import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

export function validate(chains: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    for (const chain of chains) {
      await chain.run(req);
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        error: 'Validation failed',
        details: errors.array().map((e) => e.msg),
      });
      return;
    }
    next();
  };
}
