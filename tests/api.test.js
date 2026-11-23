/**
 * ============================================================================
 * CONTRATIA MINI - SUITE DE PRUEBAS DE INTEGRACIÓN (JEST + SUPERTEST)
 * Guiado por: PLAN.md (Fase 5) y Skills api-rest e interfaces-crud
 * ============================================================================
 */

import request from 'supertest';
import app from '../src/server.js';
import { initializeDatabase } from '../src/db/init.js';

beforeAll(() => {
  // Asegurar que la base de datos cuenta con el esquema y datos de prueba limpios
  initializeDatabase();
});

describe('1. Verificación de Salud y Dashboard (CA-02)', () => {
  test('GET /api/health debe responder 200 OK y estado operativo', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('operativa');
  });

  test('GET /api/dashboard/stats debe retornar métricas agregadas', async () => {
    const res = await request(app).get('/api/dashboard/stats');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totales).toBeDefined();
    expect(res.body.data.totales.instalaciones).toBeGreaterThanOrEqual(1);
    expect(res.body.data.totales.equipos).toBeGreaterThanOrEqual(1);
    expect(res.body.data.equiposPorEstado).toBeDefined();
    expect(res.body.data.incidenciasPorEstado).toBeDefined();
    expect(Array.isArray(res.body.data.ultimasIncidencias)).toBe(true);
  });
});

describe('2. Módulo de Instalaciones (CA-01, CA-02)', () => {
  let createdInstalacionId;

  test('GET /api/instalaciones debe listar todas las instalaciones con contadores', async () => {
    const res = await request(app).get('/api/instalaciones');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0]).toHaveProperty('total_equipos');
    expect(res.body.data[0]).toHaveProperty('incidencias_activas');
  });

  test('POST /api/instalaciones debe fallar (400) si faltan campos obligatorios', async () => {
    const res = await request(app)
      .post('/api/instalaciones')
      .send({ nombre: '   ', direccion: '' });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });

  test('POST /api/instalaciones debe crear una instalación válida (201 Created)', async () => {
    const res = await request(app)
      .post('/api/instalaciones')
      .send({
        nombre: 'Teatro Principal Municipal',
        direccion: 'Plaza de las Artes 1',
        tipo: 'Cultural'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.nombre).toBe('Teatro Principal Municipal');
    createdInstalacionId = res.body.data.id;
  });

  test('GET /api/instalaciones/:id debe devolver el detalle y sus equipos', async () => {
    const res = await request(app).get(`/api/instalaciones/${createdInstalacionId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdInstalacionId);
    expect(Array.isArray(res.body.data.equipos)).toBe(true);
  });

  test('GET /api/instalaciones/:id inexistente debe responder 404', async () => {
    const res = await request(app).get('/api/instalaciones/99999');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('PUT /api/instalaciones/:id debe actualizar los datos (200 OK)', async () => {
    const res = await request(app)
      .put(`/api/instalaciones/${createdInstalacionId}`)
      .send({
        nombre: 'Teatro Principal Municipal (Renovado)',
        direccion: 'Plaza de las Artes 1, Bis',
        tipo: 'Cultural / Histórico'
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.nombre).toBe('Teatro Principal Municipal (Renovado)');
  });

  test('DELETE /api/instalaciones/:id debe eliminar la instalación (200 OK)', async () => {
    const res = await request(app).delete(`/api/instalaciones/${createdInstalacionId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    const check = await request(app).get(`/api/instalaciones/${createdInstalacionId}`);
    expect(check.statusCode).toBe(404);
  });
});

describe('3. Módulo de Equipos y Restricción de Unicidad (CA-01, CA-02)', () => {
  let tempInstId;
  let tempEquipoId;

  beforeAll(async () => {
    const instRes = await request(app)
      .post('/api/instalaciones')
      .send({
        nombre: 'Centro Logístico Central',
        direccion: 'Polígono Sur Parcela 4',
        tipo: 'Industrial'
      });
    tempInstId = instRes.body.data.id;
  });

  test('POST /api/equipos debe fallar (400) si la instalación no existe', async () => {
    const res = await request(app)
      .post('/api/equipos')
      .send({
        instalacion_id: 88888,
        nombre: 'Compresor de Aire',
        codigo_serie: 'CMP-TEST-99',
        tipo_equipo: 'Neumático'
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/equipos debe registrar un nuevo equipo (201 Created)', async () => {
    const res = await request(app)
      .post('/api/equipos')
      .send({
        instalacion_id: tempInstId,
        nombre: 'Puente Grúa 5 Toneladas',
        codigo_serie: 'CRANE-CL-001',
        tipo_equipo: 'Elevación Industrial',
        estado: 'OPERATIVO'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.estado).toBe('OPERATIVO');
    tempEquipoId = res.body.data.id;
  });

  test('POST /api/equipos con código_serie duplicado debe fallar con 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/equipos')
      .send({
        instalacion_id: tempInstId,
        nombre: 'Otro Puente Grúa',
        codigo_serie: 'CRANE-CL-001', // Repetido
        tipo_equipo: 'Elevación'
      });
    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('código de serie');
  });

  test('GET /api/equipos con filtros debe responder 200', async () => {
    const res = await request(app)
      .get('/api/equipos')
      .query({ instalacion_id: tempInstId, estado: 'OPERATIVO' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].codigo_serie).toBe('CRANE-CL-001');
  });

  test('PUT /api/equipos/:id debe actualizar el estado y campos', async () => {
    const res = await request(app)
      .put(`/api/equipos/${tempEquipoId}`)
      .send({
        instalacion_id: tempInstId,
        nombre: 'Puente Grúa 5T (Modificado)',
        codigo_serie: 'CRANE-CL-001',
        tipo_equipo: 'Elevación',
        estado: 'EN_MANTENIMIENTO'
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.estado).toBe('EN_MANTENIMIENTO');
  });

  afterAll(async () => {
    await request(app).delete(`/api/instalaciones/${tempInstId}`);
  });
});

describe('4. Gestión de Averías y Transiciones Automáticas de Estado (CA-01, CA-02, CA-04)', () => {
  let testInstId;
  let testEqId;
  let testIncId;

  beforeAll(async () => {
    // Caso de uso: Edificio público con ascensor averiado
    const inst = await request(app)
      .post('/api/instalaciones')
      .send({
        nombre: 'Edificio de Servicios Sociales',
        direccion: 'Calle Esperanza 8',
        tipo: 'Administrativo Público'
      });
    testInstId = inst.body.data.id;

    const eq = await request(app)
      .post('/api/equipos')
      .send({
        instalacion_id: testInstId,
        nombre: 'Ascensor Accesible COTA Cero',
        codigo_serie: 'ASC-SS-001',
        tipo_equipo: 'Elevación',
        estado: 'OPERATIVO'
      });
    testEqId = eq.body.data.id;
  });

  test('El equipo inicia en estado OPERATIVO', async () => {
    const eq = await request(app).get(`/api/equipos/${testEqId}`);
    expect(eq.body.data.estado).toBe('OPERATIVO');
  });

  test('Al registrar una incidencia CRITICA, el equipo pasa automáticamente a AVERIADO (CA-04)', async () => {
    const res = await request(app)
      .post('/api/incidencias')
      .send({
        equipo_id: testEqId,
        titulo: 'Avería de tracción y bloqueo de puertas en planta 1',
        descripcion: 'El ascensor se encuentra inmovilizado y emite alarma sonora continua.',
        prioridad: 'CRITICA',
        estado: 'ABIERTA'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    testIncId = res.body.data.id;

    // Verificar estado del equipo tras la avería
    const eqCheck = await request(app).get(`/api/equipos/${testEqId}`);
    expect(eqCheck.body.data.estado).toBe('AVERIADO');
  });

  test('Al resolver la incidencia, se fija fecha_resolución y el equipo vuelve a OPERATIVO (CA-04)', async () => {
    const res = await request(app)
      .put(`/api/incidencias/${testIncId}`)
      .send({
        equipo_id: testEqId,
        titulo: 'Avería de tracción y bloqueo de puertas en planta 1 (Solucionada)',
        descripcion: 'Sustituido sensor de contacto de puertas y calibrado el variador.',
        prioridad: 'CRITICA',
        estado: 'RESUELTA'
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fecha_resolucion).not.toBeNull();

    // Verificar que el equipo volvió a OPERATIVO
    const eqCheck = await request(app).get(`/api/equipos/${testEqId}`);
    expect(eqCheck.body.data.estado).toBe('OPERATIVO');
  });

  afterAll(async () => {
    await request(app).delete(`/api/instalaciones/${testInstId}`);
  });
});

describe('5. Integridad Referencial y Borrado en Cascada (CA-01)', () => {
  test('Al borrar una instalación, sus equipos e incidencias se eliminan en cascada', async () => {
    // 1. Crear instalación
    const inst = await request(app)
      .post('/api/instalaciones')
      .send({
        nombre: 'Complejo Polideportivo Este',
        direccion: 'Calle Olímpica 5',
        tipo: 'Deportivo'
      });
    const instId = inst.body.data.id;

    // 2. Crear equipo
    const eq = await request(app)
      .post('/api/equipos')
      .send({
        instalacion_id: instId,
        nombre: 'Deshumidificador Piscina',
        codigo_serie: 'DESH-POLI-01',
        tipo_equipo: 'Climatización'
      });
    const eqId = eq.body.data.id;

    // 3. Crear incidencia
    const inc = await request(app)
      .post('/api/incidencias')
      .send({
        equipo_id: eqId,
        titulo: 'Fuga de condensados',
        descripcion: 'Bandeja de goteo obstruida',
        prioridad: 'MEDIA',
        estado: 'ABIERTA'
      });
    const incId = inc.body.data.id;

    // 4. Eliminar la instalación
    const delInst = await request(app).delete(`/api/instalaciones/${instId}`);
    expect(delInst.statusCode).toBe(200);

    // 5. Verificar que el equipo y la incidencia retornan 404
    const checkEq = await request(app).get(`/api/equipos/${eqId}`);
    expect(checkEq.statusCode).toBe(404);

    const checkInc = await request(app).get(`/api/incidencias/${incId}`);
    expect(checkInc.statusCode).toBe(404);
  });
});

describe('6. Manejo de Errores y Rutas No Encontradas (CA-02)', () => {
  test('Ruta no encontrada debe responder 404 con JSON estructurado', async () => {
    const res = await request(app).get('/api/ruta-inexistente-test');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Ruta no encontrada');
  });

  test('ID alfanumérico no válido debe responder 400 Bad Request', async () => {
    const res = await request(app).get('/api/instalaciones/no-es-un-numero');
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('inválido');
  });
});
