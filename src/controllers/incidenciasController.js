import db from '../config/database.js';

const PRIORIDADES_VALIDAS = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];
const ESTADOS_VALIDOS = ['ABIERTA', 'EN_PROGRESO', 'RESUELTA', 'CERRADA'];

export const incidenciasController = {
  // GET /api/incidencias
  listar: (req, res, next) => {
    try {
      const { estado, prioridad, equipo_id } = req.query;

      let query = `
        SELECT 
          inc.id,
          inc.equipo_id,
          inc.titulo,
          inc.descripcion,
          inc.prioridad,
          inc.estado,
          inc.fecha_reporte,
          inc.fecha_resolucion,
          e.nombre AS equipo_nombre,
          e.codigo_serie AS equipo_codigo,
          i.id AS instalacion_id,
          i.nombre AS instalacion_nombre
        FROM incidencias inc
        JOIN equipos e ON inc.equipo_id = e.id
        JOIN instalaciones i ON e.instalacion_id = i.id
        WHERE 1=1
      `;
      const params = [];

      if (estado) {
        const est = estado.toUpperCase().trim();
        if (ESTADOS_VALIDOS.includes(est)) {
          query += ' AND inc.estado = ?';
          params.push(est);
        }
      }

      if (prioridad) {
        const prio = prioridad.toUpperCase().trim();
        if (PRIORIDADES_VALIDAS.includes(prio)) {
          query += ' AND inc.prioridad = ?';
          params.push(prio);
        }
      }

      if (equipo_id) {
        const eqId = parseInt(equipo_id, 10);
        if (!isNaN(eqId) && eqId > 0) {
          query += ' AND inc.equipo_id = ?';
          params.push(eqId);
        }
      }

      query += `
        ORDER BY 
          CASE inc.estado
            WHEN 'ABIERTA' THEN 1
            WHEN 'EN_PROGRESO' THEN 2
            WHEN 'RESUELTA' THEN 3
            WHEN 'CERRADA' THEN 4
          END,
          CASE inc.prioridad
            WHEN 'CRITICA' THEN 1
            WHEN 'ALTA' THEN 2
            WHEN 'MEDIA' THEN 3
            WHEN 'BAJA' THEN 4
          END,
          inc.fecha_reporte DESC
      `;

      const incidencias = db.prepare(query).all(...params);
      return res.status(200).json({ success: true, data: incidencias });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/incidencias/:id
  obtenerPorId: (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ success: false, error: 'Identificador de incidencia inválido' });
      }

      const incidencia = db.prepare(`
        SELECT 
          inc.*,
          e.nombre AS equipo_nombre,
          e.codigo_serie AS equipo_codigo,
          e.tipo_equipo,
          e.estado AS equipo_estado,
          i.id AS instalacion_id,
          i.nombre AS instalacion_nombre,
          i.direccion AS instalacion_direccion
        FROM incidencias inc
        JOIN equipos e ON inc.equipo_id = e.id
        JOIN instalaciones i ON e.instalacion_id = i.id
        WHERE inc.id = ?
      `).get(id);

      if (!incidencia) {
        return res.status(404).json({ success: false, error: 'Incidencia no encontrada' });
      }

      return res.status(200).json({ success: true, data: incidencia });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/incidencias
  crear: (req, res, next) => {
    try {
      const { equipo_id, titulo, descripcion, prioridad, estado } = req.body;

      const eqId = parseInt(equipo_id, 10);
      if (isNaN(eqId) || eqId <= 0) {
        return res.status(400).json({ success: false, error: 'Debe vincular la incidencia a un equipo válido' });
      }

      if (!titulo || typeof titulo !== 'string' || !titulo.trim()) {
        return res.status(400).json({ success: false, error: 'El título de la incidencia es obligatorio' });
      }

      if (!descripcion || typeof descripcion !== 'string' || !descripcion.trim()) {
        return res.status(400).json({ success: false, error: 'La descripción de la avería es obligatoria' });
      }

      const prioridadFinal = prioridad ? prioridad.toUpperCase().trim() : 'MEDIA';
      if (!PRIORIDADES_VALIDAS.includes(prioridadFinal)) {
        return res.status(400).json({
          success: false,
          error: `Prioridad inválida. Debe ser: ${PRIORIDADES_VALIDAS.join(', ')}`
        });
      }

      const estadoFinal = estado ? estado.toUpperCase().trim() : 'ABIERTA';
      if (!ESTADOS_VALIDOS.includes(estadoFinal)) {
        return res.status(400).json({
          success: false,
          error: `Estado inválido. Debe ser: ${ESTADOS_VALIDOS.join(', ')}`
        });
      }

      // Comprobar que el equipo existe
      const equipo = db.prepare('SELECT id, estado FROM equipos WHERE id = ?').get(eqId);
      if (!equipo) {
        return res.status(400).json({ success: false, error: 'El equipo especificado no existe' });
      }

      let nuevaIncidenciaId = null;

      // Transacción atómica: Insertar incidencia y actualizar estado de equipo si procede
      db.exec('BEGIN');
      try {
        const stmt = db.prepare(`
          INSERT INTO incidencias (equipo_id, titulo, descripcion, prioridad, estado)
          VALUES (?, ?, ?, ?, ?)
        `);
        const resultado = stmt.run(eqId, titulo.trim(), descripcion.trim(), prioridadFinal, estadoFinal);
        nuevaIncidenciaId = resultado.lastInsertRowid;

        // Regla de negocio: Si la avería es ALTA o CRITICA y está abierta, el equipo pasa a AVERIADO
        if (['ALTA', 'CRITICA'].includes(prioridadFinal) && ['ABIERTA', 'EN_PROGRESO'].includes(estadoFinal)) {
          db.prepare("UPDATE equipos SET estado = 'AVERIADO' WHERE id = ?").run(eqId);
        }

        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }

      const nueva = db.prepare(`
        SELECT 
          inc.*,
          e.nombre AS equipo_nombre,
          e.estado AS equipo_estado,
          i.nombre AS instalacion_nombre
        FROM incidencias inc
        JOIN equipos e ON inc.equipo_id = e.id
        JOIN instalaciones i ON e.instalacion_id = i.id
        WHERE inc.id = ?
      `).get(nuevaIncidenciaId);

      return res.status(201).json({
        success: true,
        data: nueva,
        message: 'Incidencia registrada con éxito'
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/incidencias/:id
  actualizar: (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ success: false, error: 'Identificador de incidencia inválido' });
      }

      const incidenciaActual = db.prepare('SELECT * FROM incidencias WHERE id = ?').get(id);
      if (!incidenciaActual) {
        return res.status(404).json({ success: false, error: 'Incidencia no encontrada' });
      }

      const { titulo, descripcion, prioridad, estado, equipo_id } = req.body;

      if (!titulo || typeof titulo !== 'string' || !titulo.trim()) {
        return res.status(400).json({ success: false, error: 'El título no puede estar vacío' });
      }

      if (!descripcion || typeof descripcion !== 'string' || !descripcion.trim()) {
        return res.status(400).json({ success: false, error: 'La descripción no puede estar vacía' });
      }

      const prioridadFinal = prioridad ? prioridad.toUpperCase().trim() : incidenciaActual.prioridad;
      if (!PRIORIDADES_VALIDAS.includes(prioridadFinal)) {
        return res.status(400).json({
          success: false,
          error: `Prioridad inválida. Debe ser: ${PRIORIDADES_VALIDAS.join(', ')}`
        });
      }

      const estadoFinal = estado ? estado.toUpperCase().trim() : incidenciaActual.estado;
      if (!ESTADOS_VALIDOS.includes(estadoFinal)) {
        return res.status(400).json({
          success: false,
          error: `Estado inválido. Debe ser: ${ESTADOS_VALIDOS.join(', ')}`
        });
      }

      const eqId = equipo_id ? parseInt(equipo_id, 10) : incidenciaActual.equipo_id;

      // Calcular fecha_resolucion según el estado
      let fechaResolucion = incidenciaActual.fecha_resolucion;
      if (['RESUELTA', 'CERRADA'].includes(estadoFinal)) {
        if (!fechaResolucion) {
          fechaResolucion = new Date().toISOString();
        }
      } else {
        fechaResolucion = null; // Si se reabre, se anula la fecha de resolución
      }

      // Transacción para consistencia entre estado de incidencia y estado del equipo
      db.exec('BEGIN');
      try {
        db.prepare(`
          UPDATE incidencias 
          SET equipo_id = ?, titulo = ?, descripcion = ?, prioridad = ?, estado = ?, fecha_resolucion = ?
          WHERE id = ?
        `).run(eqId, titulo.trim(), descripcion.trim(), prioridadFinal, estadoFinal, fechaResolucion, id);

        // Regla de negocio:
        if (['RESUELTA', 'CERRADA'].includes(estadoFinal)) {
          // Comprobar si al equipo le quedan otras incidencias activas críticas o altas
          const otrasActivas = db.prepare(`
            SELECT COUNT(*) AS total 
            FROM incidencias 
            WHERE equipo_id = ? AND id != ? AND estado IN ('ABIERTA', 'EN_PROGRESO')
          `).get(eqId, id).total;

          // Si no tiene más incidencias activas, devolverlo a OPERATIVO
          if (otrasActivas === 0) {
            db.prepare("UPDATE equipos SET estado = 'OPERATIVO' WHERE id = ?").run(eqId);
          }
        } else if (['ALTA', 'CRITICA'].includes(prioridadFinal)) {
          // Si está abierta o en progreso y es alta/crítica, marcar equipo como AVERIADO
          db.prepare("UPDATE equipos SET estado = 'AVERIADO' WHERE id = ?").run(eqId);
        }

        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }

      const actualizada = db.prepare(`
        SELECT 
          inc.*,
          e.nombre AS equipo_nombre,
          e.estado AS equipo_estado,
          i.nombre AS instalacion_nombre
        FROM incidencias inc
        JOIN equipos e ON inc.equipo_id = e.id
        JOIN instalaciones i ON e.instalacion_id = i.id
        WHERE inc.id = ?
      `).get(id);

      return res.status(200).json({
        success: true,
        data: actualizada,
        message: 'Incidencia actualizada con éxito'
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/incidencias/:id
  eliminar: (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ success: false, error: 'Identificador de incidencia inválido' });
      }

      const incidencia = db.prepare('SELECT id, titulo, equipo_id FROM incidencias WHERE id = ?').get(id);
      if (!incidencia) {
        return res.status(404).json({ success: false, error: 'Incidencia no encontrada' });
      }

      db.prepare('DELETE FROM incidencias WHERE id = ?').run(id);

      return res.status(200).json({
        success: true,
        message: `Incidencia "${incidencia.titulo}" eliminada con éxito`
      });
    } catch (error) {
      next(error);
    }
  }
};
