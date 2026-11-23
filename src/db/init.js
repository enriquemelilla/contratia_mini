import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function initializeDatabase() {
  console.log('🔄 Inicializando base de datos...');

  // 1. Cargar y ejecutar esquema DDL
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schemaSql);
  console.log('✅ Esquema DDL ejecutado correctamente.');

  // 2. Comprobar si ya existen datos
  const countInstalaciones = db.prepare('SELECT COUNT(*) AS total FROM instalaciones').get().total;

  if (countInstalaciones === 0) {
    console.log('🌱 Insertando datos de prueba (Seed)...');

    const insertInstalacion = db.prepare(`
      INSERT INTO instalaciones (nombre, direccion, tipo)
      VALUES (?, ?, ?)
    `);

    const insertEquipo = db.prepare(`
      INSERT INTO equipos (instalacion_id, nombre, codigo_serie, tipo_equipo, estado)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertIncidencia = db.prepare(`
      INSERT INTO incidencias (equipo_id, titulo, descripcion, prioridad, estado, fecha_resolucion)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN');
    try {
      // Instalación 1: Biblioteca Central (Edificio público)
      const inst1 = insertInstalacion.run(
        'Biblioteca Pública Central',
        'Calle Mayor 12, Distrito Centro',
        'Educativo / Cultural'
      );
      const inst1Id = inst1.lastInsertRowid;

      // Equipos para Biblioteca Central
      const eqAscensor = insertEquipo.run(
        inst1Id,
        'Ascensor Principal - Bloque A',
        'ASC-LIB-001',
        'Elevación',
        'AVERIADO'
      );
      insertEquipo.run(
        inst1Id,
        'Sistema Climatización Central',
        'CLIM-LIB-101',
        'Climatización',
        'OPERATIVO'
      );

      // Incidencias para el Ascensor (Caso de uso principal)
      insertIncidencia.run(
        eqAscensor.lastInsertRowid,
        'Bloqueo entre plantas 2 y 3',
        'El ascensor se detuvo repentinamente. Requiere intervención técnica urgente en el sistema de frenado y tracción.',
        'CRITICA',
        'ABIERTA',
        null
      );
      insertIncidencia.run(
        eqAscensor.lastInsertRowid,
        'Desgaste en zapatas de freno secundario',
        'Mantenimiento correctivo anterior completado satisfactoriamente.',
        'MEDIA',
        'RESUELTA',
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      );

      // Instalación 2: Polideportivo Municipal
      const inst2 = insertInstalacion.run(
        'Polideportivo Municipal Los Olivos',
        'Av. del Deporte s/n',
        'Deportivo'
      );
      const inst2Id = inst2.lastInsertRowid;

      const eqCaldera = insertEquipo.run(
        inst2Id,
        'Caldera de Agua Caliente Sanitaria',
        'CALD-POLI-02',
        'Calefacción / ACS',
        'OPERATIVO'
      );
      insertEquipo.run(
        inst2Id,
        'Cuadro Eléctrico Principal',
        'ELEC-POLI-01',
        'Eléctrico',
        'OPERATIVO'
      );

      // Incidencia para Caldera
      insertIncidencia.run(
        eqCaldera.lastInsertRowid,
        'Caída de presión intermitente en circuito B',
        'La presión baja de 1.2 bar durante las horas punta de las duchas. En diagnóstico.',
        'ALTA',
        'EN_PROGRESO',
        null
      );

      // Instalación 3: Centro de Salud Norte
      const inst3 = insertInstalacion.run(
        'Centro de Salud Norte',
        'Plaza de la Salud 4',
        'Sanitario'
      );
      const inst3Id = inst3.lastInsertRowid;

      insertEquipo.run(
        inst3Id,
        'Generador Eléctrico de Emergencia',
        'GEN-CS-99',
        'Generación Eléctrica',
        'EN_MANTENIMIENTO'
      );

      db.exec('COMMIT');
      console.log('✅ Datos de prueba insertados con éxito.');
    } catch (error) {
      db.exec('ROLLBACK');
      console.error('❌ Error durante la inserción de semillas:', error);
      throw error;
    }
  } else {
    console.log(`ℹ️ La base de datos ya contiene ${countInstalaciones} instalaciones. No se sobreescribieron datos.`);
  }

  // Resumen de verificación
  const totalInst = db.prepare('SELECT COUNT(*) AS total FROM instalaciones').get().total;
  const totalEq = db.prepare('SELECT COUNT(*) AS total FROM equipos').get().total;
  const totalInc = db.prepare('SELECT COUNT(*) AS total FROM incidencias').get().total;

  console.log(`📊 Estado actual de la base de datos:
  - Instalaciones: ${totalInst}
  - Equipos: ${totalEq}
  - Incidencias: ${totalInc}`);
}

// Ejecutar si se invoca directamente
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initializeDatabase();
}
