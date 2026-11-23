import { Router } from 'express';
import { incidenciasController } from '../controllers/incidenciasController.js';

const router = Router();

router.get('/', incidenciasController.listar);
router.get('/:id', incidenciasController.obtenerPorId);
router.post('/', incidenciasController.crear);
router.put('/:id', incidenciasController.actualizar);
router.delete('/:id', incidenciasController.eliminar);

export default router;
