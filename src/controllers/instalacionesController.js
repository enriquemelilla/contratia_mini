import db from '../config/database.js';

export const instalacionesController = {
  // GET /api/instalaciones
  listar: (req, res, next) => {
    try {
      const stmt = db.prepare(`
        SELECT 
          i.id,
          i.nombre,
          i.direccion,
          i.tipo,
          i.created_at,
          COUNT(DISTINCT e.id) AS total_equipos,
          COUNT(DISTINCT CASE WHEN inc.estado IN ('ABIERTA', 'EN_PROGRESO') THEN inc.id END) AS incidencias_activas
        FROM instalaciones i
        LEFT JOIN equipos e ON e.instalacion_id = i.id
        LEFT JOIN incidencias inc ON inc.equipo_id = e.id
        GROUP BY i.id
        ORDER BY i.nombre ASC
      `);
      const instalaciones = stmt.all();
      return res.status(200).json({ success: true, data: instalaciones });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/instalaciones/:id
  obtenerPorId: (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ success: false, error: 'Identificador de instalación inválido' });
      }

      const instalacion = db.prepare('SELECT * FROM instalaciones WHERE id = ?').get(id);
      if (!instalacion) {
        return res.status(404).json({ success: false, error: 'Instalación no encontrada' });
      }

      // Obtener equipos vinculados a esta instalación
      const equipos = db.prepare(`
        SELECT e.*, 
               COUNT(CASE WHEN inc.estado IN ('ABIERTA', 'EN_PROGRESO') THEN 1 END) AS incidencias_activas
        FROM equipos e
        LEFT JOIN incidencias inc ON inc.equipo_id = e.id
        WHERE e.instalacion_id = ?
        GROUP BY e.id
        ORDER BY e.nombre ASC
      `).all(id);

      return res.status(200).json({
        success: true,
        data: {
          ...instalacion,
          equipos
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/instalaciones
  crear: (req, res, next) => {
    try {
      const { nombre, direccion, tipo } = req.body;

      if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
        return res.status(400).json({ success: false, error: 'El nombre de la instalación es obligatorio' });
      }
      if (!direccion || typeof direccion !== 'string' || !direccion.trim()) {
        return res.status(400).json({ success: false, error: 'La dirección es obligatoria' });
      }
      if (!tipo || typeof tipo !== 'string' || !tipo.trim()) {
        return res.status(400).json({ success: false, error: 'El tipo de instalación es obligatorio' });
      }

      const stmt = db.prepare(`
        INSERT INTO instalaciones (nombre, direccion, tipo)
        VALUES (?, ?, ?)
      `);
      const resultado = stmt.run(nombre.trim(), direccion.trim(), tipo.trim());

      const nuevaInstalacion = db.prepare('SELECT * FROM instalaciones WHERE id = ?').get(resultado.lastInsertRowid);

      return res.status(201).json({
        success: true,
        data: nuevaInstalacion,
        message: 'Instalación creada con éxito'
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/instalaciones/:id
  actualizar: (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ success: false, error: 'Identificador de instalación inválido' });
      }

      const existe = db.prepare('SELECT id FROM instalaciones WHERE id = ?').get(id);
      if (!existe) {
        return res.status(404).json({ success: false, error: 'Instalación no encontrada' });
      }

      const { nombre, direccion, tipo } = req.body;
      if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
        return res.status(400).json({ success: false, error: 'El nombre no puede estar vacío' });
      }
      if (!direccion || typeof direccion !== 'string' || !direccion.trim()) {
        return res.status(400).json({ success: false, error: 'La dirección no puede estar vacía' });
      }
      if (!tipo || typeof tipo !== 'string' || !tipo.trim()) {
        return res.status(400).json({ success: false, error: 'El tipo no puede estar vacío' });
      }

      db.prepare(`
        UPDATE instalaciones 
        SET nombre = ?, direccion = ?, tipo = ?
        WHERE id = ?
      `).run(nombre.trim(), direccion.trim(), tipo.trim(), id);

      const actualizada = db.prepare('SELECT * FROM instalaciones WHERE id = ?').get(id);

      return res.status(200).json({
        success: true,
        data: actualizada,
        message: 'Instalación actualizada con éxito'
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/instalaciones/:id
  eliminar: (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ success: false, error: 'Identificador de instalación inválido' });
      }

      const instalacion = db.prepare('SELECT id, nombre FROM instalaciones WHERE id = ?').get(id);
      if (!instalacion) {
        return res.status(404).json({ success: false, error: 'Instalación no encontrada' });
      }

      // Borrado en cascada gestionado por SQLite (ON DELETE CASCADE)
      db.prepare('DELETE FROM instalaciones WHERE id = ?').run(id);

      return res.status(200).json({
        success: true,
        message: `Instalación "${instalacion.nombre}" y sus registros asociados eliminados con éxito`
      });
    } catch (error) {
      next(error);
    }
  }
};
