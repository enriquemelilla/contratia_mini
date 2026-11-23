import { Router } from 'express';
import { instalacionesController } from '../controllers/instalacionesController.js';

const router = Router();

router.get('/', instalacionesController.listar);
router.get('/:id', instalacionesController.obtenerPorId);
router.post('/', instalacionesController.crear);
router.put('/:id', instalacionesController.actualizar);
router.delete('/:id', instalacionesController.eliminar);

export default router;
