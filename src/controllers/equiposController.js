import db from '../config/database.js';

const ESTADOS_VALIDOS = ['OPERATIVO', 'AVERIADO', 'EN_MANTENIMIENTO'];

export const equiposController = {
  // GET /api/equipos
  listar: (req, res, next) => {
    try {
      const { instalacion_id, estado } = req.query;
      let query = `
        SELECT 
          e.id,
          e.instalacion_id,
          e.nombre,
          e.codigo_serie,
          e.tipo_equipo,
          e.estado,
          e.created_at,
          i.nombre AS instalacion_nombre,
          COUNT(CASE WHEN inc.estado IN ('ABIERTA', 'EN_PROGRESO') THEN 1 END) AS incidencias_activas
        FROM equipos e
        JOIN instalaciones i ON e.instalacion_id = i.id
        LEFT JOIN incidencias inc ON inc.equipo_id = e.id
        WHERE 1=1
      `;
      const params = [];

      if (instalacion_id) {
        const instId = parseInt(instalacion_id, 10);
        if (!isNaN(instId) && instId > 0) {
          query += ' AND e.instalacion_id = ?';
          params.push(instId);
        }
      }

      if (estado && typeof estado === 'string') {
        const est = estado.toUpperCase().trim();
        if (ESTADOS_VALIDOS.includes(est)) {
          query += ' AND e.estado = ?';
          params.push(est);
        }
      }

      query += ' GROUP BY e.id ORDER BY e.nombre ASC';

      const equipos = db.prepare(query).all(...params);
      return res.status(200).json({ success: true, data: equipos });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/equipos/:id
  obtenerPorId: (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ success: false, error: 'Identificador de equipo inválido' });
      }

      const equipo = db.prepare(`
        SELECT e.*, i.nombre AS instalacion_nombre, i.direccion AS instalacion_direccion
        FROM equipos e
        JOIN instalaciones i ON e.instalacion_id = i.id
        WHERE e.id = ?
      `).get(id);

      if (!equipo) {
        return res.status(404).json({ success: false, error: 'Equipo no encontrado' });
      }

      // Obtener el historial de incidencias del equipo
      const incidencias = db.prepare(`
        SELECT * FROM incidencias 
        WHERE equipo_id = ? 
        ORDER BY fecha_reporte DESC
      `).all(id);

      return res.status(200).json({
        success: true,
        data: {
          ...equipo,
          incidencias
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/equipos
  crear: (req, res, next) => {
    try {
      const { instalacion_id, nombre, codigo_serie, tipo_equipo, estado } = req.body;

      const instId = parseInt(instalacion_id, 10);
      if (isNaN(instId) || instId <= 0) {
        return res.status(400).json({ success: false, error: 'Debe seleccionar una instalación válida' });
      }

      if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
        return res.status(400).json({ success: false, error: 'El nombre del equipo es obligatorio' });
      }

      if (!codigo_serie || typeof codigo_serie !== 'string' || !codigo_serie.trim()) {
        return res.status(400).json({ success: false, error: 'El código de serie o identificador es obligatorio' });
      }

      if (!tipo_equipo || typeof tipo_equipo !== 'string' || !tipo_equipo.trim()) {
        return res.status(400).json({ success: false, error: 'El tipo o categoría de equipo es obligatorio' });
      }

      const estadoFinal = estado ? estado.toUpperCase().trim() : 'OPERATIVO';
      if (!ESTADOS_VALIDOS.includes(estadoFinal)) {
        return res.status(400).json({
          success: false,
          error: `Estado inválido. Debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}`
        });
      }

      // Comprobar que la instalación existe
      const instalacionExiste = db.prepare('SELECT id FROM instalaciones WHERE id = ?').get(instId);
      if (!instalacionExiste) {
        return res.status(400).json({ success: false, error: 'La instalación especificada no existe' });
      }

      // Comprobar código de serie único
      const codigoExiste = db.prepare('SELECT id FROM equipos WHERE codigo_serie = ?').get(codigo_serie.trim());
      if (codigoExiste) {
        return res.status(409).json({ success: false, error: 'Ya existe un equipo con ese mismo código de serie' });
      }

      const stmt = db.prepare(`
        INSERT INTO equipos (instalacion_id, nombre, codigo_serie, tipo_equipo, estado)
        VALUES (?, ?, ?, ?, ?)
      `);
      const resultado = stmt.run(instId, nombre.trim(), codigo_serie.trim(), tipo_equipo.trim(), estadoFinal);

      const nuevoEquipo = db.prepare(`
        SELECT e.*, i.nombre AS instalacion_nombre 
        FROM equipos e 
        JOIN instalaciones i ON e.instalacion_id = i.id 
        WHERE e.id = ?
      `).get(resultado.lastInsertRowid);

      return res.status(201).json({
        success: true,
        data: nuevoEquipo,
        message: 'Equipo registrado con éxito'
      });
    } catch (error) {
      if (error.message && error.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ success: false, error: 'El código de serie ya está en uso' });
      }
      next(error);
    }
  },

  // PUT /api/equipos/:id
  actualizar: (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ success: false, error: 'Identificador de equipo inválido' });
      }

      const equipoActual = db.prepare('SELECT * FROM equipos WHERE id = ?').get(id);
      if (!equipoActual) {
        return res.status(404).json({ success: false, error: 'Equipo no encontrado' });
      }

      const { nombre, codigo_serie, tipo_equipo, estado, instalacion_id } = req.body;

      if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
        return res.status(400).json({ success: false, error: 'El nombre del equipo no puede estar vacío' });
      }

      if (!codigo_serie || typeof codigo_serie !== 'string' || !codigo_serie.trim()) {
        return res.status(400).json({ success: false, error: 'El código de serie no puede estar vacío' });
      }

      if (!tipo_equipo || typeof tipo_equipo !== 'string' || !tipo_equipo.trim()) {
        return res.status(400).json({ success: false, error: 'El tipo de equipo no puede estar vacío' });
      }

      const estadoFinal = estado ? estado.toUpperCase().trim() : equipoActual.estado;
      if (!ESTADOS_VALIDOS.includes(estadoFinal)) {
        return res.status(400).json({
          success: false,
          error: `Estado inválido. Debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}`
        });
      }

      const instId = instalacion_id ? parseInt(instalacion_id, 10) : equipoActual.instalacion_id;
      if (isNaN(instId) || instId <= 0) {
        return res.status(400).json({ success: false, error: 'Instalación inválida' });
      }

      // Validar código de serie no duplicado en otro equipo
      const duplicado = db.prepare('SELECT id FROM equipos WHERE codigo_serie = ? AND id != ?').get(codigo_serie.trim(), id);
      if (duplicado) {
        return res.status(409).json({ success: false, error: 'El código de serie ya está en uso por otro equipo' });
      }

      db.prepare(`
        UPDATE equipos 
        SET instalacion_id = ?, nombre = ?, codigo_serie = ?, tipo_equipo = ?, estado = ?
        WHERE id = ?
      `).run(instId, nombre.trim(), codigo_serie.trim(), tipo_equipo.trim(), estadoFinal, id);

      const actualizado = db.prepare(`
        SELECT e.*, i.nombre AS instalacion_nombre 
        FROM equipos e 
        JOIN instalaciones i ON e.instalacion_id = i.id 
        WHERE e.id = ?
      `).get(id);

      return res.status(200).json({
        success: true,
        data: actualizado,
        message: 'Equipo actualizado con éxito'
      });
    } catch (error) {
      if (error.message && error.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ success: false, error: 'El código de serie ya está registrado' });
      }
      next(error);
    }
  },

  // DELETE /api/equipos/:id
  eliminar: (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ success: false, error: 'Identificador de equipo inválido' });
      }

      const equipo = db.prepare('SELECT id, nombre FROM equipos WHERE id = ?').get(id);
      if (!equipo) {
        return res.status(404).json({ success: false, error: 'Equipo no encontrado' });
      }

      db.prepare('DELETE FROM equipos WHERE id = ?').run(id);

      return res.status(200).json({
        success: true,
        message: `Equipo "${equipo.nombre}" y su historial de incidencias eliminados con éxito`
      });
    } catch (error) {
      next(error);
    }
  }
};
