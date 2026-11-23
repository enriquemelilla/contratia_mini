import { Router } from 'express';
import { equiposController } from '../controllers/equiposController.js';

const router = Router();

router.get('/', equiposController.listar);
router.get('/:id', equiposController.obtenerPorId);
router.post('/', equiposController.crear);
router.put('/:id', equiposController.actualizar);
router.delete('/:id', equiposController.eliminar);

export default router;
