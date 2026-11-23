import db from '../config/database.js';

export const dashboardController = {
  // GET /api/dashboard/stats
  estadisticas: (req, res, next) => {
    try {
      const totalInstalaciones = db.prepare('SELECT COUNT(*) AS total FROM instalaciones').get().total;
      const totalEquipos = db.prepare('SELECT COUNT(*) AS total FROM equipos').get().total;
      const totalIncidencias = db.prepare('SELECT COUNT(*) AS total FROM incidencias').get().total;

      // Equipos por estado
      const equiposPorEstadoRaw = db.prepare(`
        SELECT estado, COUNT(*) AS cantidad 
        FROM equipos 
        GROUP BY estado
      `).all();

      const equiposPorEstado = {
        OPERATIVO: 0,
        AVERIADO: 0,
        EN_MANTENIMIENTO: 0
      };
      equiposPorEstadoRaw.forEach(item => {
        if (equiposPorEstado[item.estado] !== undefined) {
          equiposPorEstado[item.estado] = item.cantidad;
        }
      });

      // Incidencias por estado
      const incidenciasPorEstadoRaw = db.prepare(`
        SELECT estado, COUNT(*) AS cantidad 
        FROM incidencias 
        GROUP BY estado
      `).all();

      const incidenciasPorEstado = {
        ABIERTA: 0,
        EN_PROGRESO: 0,
        RESUELTA: 0,
        CERRADA: 0
      };
      incidenciasPorEstadoRaw.forEach(item => {
        if (incidenciasPorEstado[item.estado] !== undefined) {
          incidenciasPorEstado[item.estado] = item.cantidad;
        }
      });

      // Incidencias activas (Abierta + En progreso)
      const incidenciasActivas = incidenciasPorEstado.ABIERTA + incidenciasPorEstado.EN_PROGRESO;

      // Incidencias críticas / urgentes activas
      const incidenciasCriticasActivas = db.prepare(`
        SELECT COUNT(*) AS total 
        FROM incidencias 
        WHERE prioridad IN ('CRITICA', 'ALTA') AND estado IN ('ABIERTA', 'EN_PROGRESO')
      `).get().total;

      // Últimas 5 incidencias reportadas
      const ultimasIncidencias = db.prepare(`
        SELECT 
          inc.id,
          inc.titulo,
          inc.prioridad,
          inc.estado,
          inc.fecha_reporte,
          e.nombre AS equipo_nombre,
          i.nombre AS instalacion_nombre
        FROM incidencias inc
        JOIN equipos e ON inc.equipo_id = e.id
        JOIN instalaciones i ON e.instalacion_id = i.id
        ORDER BY inc.fecha_reporte DESC
        LIMIT 5
      `).all();

      return res.status(200).json({
        success: true,
        data: {
          totales: {
            instalaciones: totalInstalaciones,
            equipos: totalEquipos,
            incidencias: totalIncidencias,
            incidencias_activas: incidenciasActivas,
            incidencias_criticas: incidenciasCriticasActivas
          },
          equiposPorEstado,
          incidenciasPorEstado,
          ultimasIncidencias
        }
      });
    } catch (error) {
      next(error);
    }
  }
};
