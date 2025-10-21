import { Router } from 'express';
import { showcasesRouter } from './showcases.js';

const router = Router();

router.use('/showcases', showcasesRouter);

export { router as apiRouter };
