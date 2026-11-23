import app from './src/server.js';
import http from 'http';

// Función auxiliar para realizar peticiones HTTP de test contra el servidor Express
function request(server, method, path, body = null) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const options = {
      hostname: '127.0.0.1',
      port: address.port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Iniciando batería de pruebas de la API REST (Fase 2)...');

  // Iniciar servidor en puerto efímero (0)
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`📡 Servidor de pruebas activo en puerto ${port}\n`);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const rHealth = await request(server, 'GET', '/api/health');
    assert(rHealth.status === 200 && rHealth.body.success === true, 'GET /api/health devuelve 200 OK');

    // 2. Dashboard
    const rDash = await request(server, 'GET', '/api/dashboard/stats');
    assert(rDash.status === 200 && rDash.body.data.totales.instalaciones > 0, 'GET /api/dashboard/stats devuelve métricas completas');

    // 3. Instalaciones: Listar
    const rInstList = await request(server, 'GET', '/api/instalaciones');
    assert(rInstList.status === 200 && Array.isArray(rInstList.body.data), 'GET /api/instalaciones devuelve array');
    const totalInstInicial = rInstList.body.data.length;

    // 4. Instalaciones: Crear (Validación 400)
    const rInstBad = await request(server, 'POST', '/api/instalaciones', { nombre: '' });
    assert(rInstBad.status === 400 && rInstBad.body.success === false, 'POST /api/instalaciones rechaza datos incompletos con 400');

    // 5. Instalaciones: Crear OK (201)
    const rInstNew = await request(server, 'POST', '/api/instalaciones', {
      nombre: 'Edificio de Prueba API',
      direccion: 'Calle Test 123',
      tipo: 'Administrativo'
    });
    assert(rInstNew.status === 201 && rInstNew.body.data.id > 0, 'POST /api/instalaciones crea recurso y devuelve 201 Created');
    const testInstId = rInstNew.body.data.id;

    // 6. Instalaciones: Obtener por ID
    const rInstGet = await request(server, 'GET', `/api/instalaciones/${testInstId}`);
    assert(rInstGet.status === 200 && rInstGet.body.data.nombre === 'Edificio de Prueba API', 'GET /api/instalaciones/:id devuelve detalle');

    // 7. Equipos: Crear OK (201)
    const rEqNew = await request(server, 'POST', '/api/equipos', {
      instalacion_id: testInstId,
      nombre: 'Montacargas Test',
      codigo_serie: 'MNT-TEST-001',
      tipo_equipo: 'Elevación',
      estado: 'OPERATIVO'
    });
    assert(rEqNew.status === 201 && rEqNew.body.data.id > 0, 'POST /api/equipos registra equipo y devuelve 201');
    const testEqId = rEqNew.body.data.id;

    // 8. Equipos: Unicidad de código de serie (409 Conflict)
    const rEqDup = await request(server, 'POST', '/api/equipos', {
      instalacion_id: testInstId,
      nombre: 'Montacargas Clon',
      codigo_serie: 'MNT-TEST-001',
      tipo_equipo: 'Elevación'
    });
    assert(rEqDup.status === 409 && rEqDup.body.success === false, 'POST /api/equipos rechaza código de serie duplicado con 409 Conflict');

    // 9. Incidencias: Crear con prioridad CRITICA y verificar actualización de estado del equipo a AVERIADO
    const rIncNew = await request(server, 'POST', '/api/incidencias', {
      equipo_id: testEqId,
      titulo: 'Fallo crítico en sistema hidráulico',
      descripcion: 'Pérdida súbita de fluido de freno.',
      prioridad: 'CRITICA',
      estado: 'ABIERTA'
    });
    assert(rIncNew.status === 201 && rIncNew.body.data.id > 0, 'POST /api/incidencias registra incidencia y devuelve 201');
    const testIncId = rIncNew.body.data.id;

    // Comprobar que el equipo pasó automáticamente a AVERIADO
    const rEqCheck = await request(server, 'GET', `/api/equipos/${testEqId}`);
    assert(rEqCheck.body.data.estado === 'AVERIADO', 'Lógica de negocio: El equipo pasa a AVERIADO automáticamente');

    // 10. Incidencias: Resolver incidencia y verificar que el equipo vuelve a OPERATIVO
    const rIncResolve = await request(server, 'PUT', `/api/incidencias/${testIncId}`, {
      titulo: 'Fallo crítico en sistema hidráulico (Subsanado)',
      descripcion: 'Válvula sustituida y circuito purgado con éxito.',
      prioridad: 'CRITICA',
      estado: 'RESUELTA'
    });
    assert(rIncResolve.status === 200 && rIncResolve.body.data.fecha_resolucion !== null, 'PUT /api/incidencias resuelve y fija fecha_resolucion');

    const rEqRestored = await request(server, 'GET', `/api/equipos/${testEqId}`);
    assert(rEqRestored.body.data.estado === 'OPERATIVO', 'Lógica de negocio: El equipo se restaura a OPERATIVO al resolver su avería');

    // 11. Borrado y Cascada: Eliminar instalación y verificar cascada
    const rInstDel = await request(server, 'DELETE', `/api/instalaciones/${testInstId}`);
    assert(rInstDel.status === 200, 'DELETE /api/instalaciones/:id devuelve 200 OK');

    const rEqAfterDel = await request(server, 'GET', `/api/equipos/${testEqId}`);
    assert(rEqAfterDel.status === 404, 'Integridad en Cascada: El equipo fue eliminado en cascada (404)');

    const rIncAfterDel = await request(server, 'GET', `/api/incidencias/${testIncId}`);
    assert(rIncAfterDel.status === 404, 'Integridad en Cascada: La incidencia fue eliminada en cascada (404)');

    // 12. Ruta inexistente (404)
    const r404 = await request(server, 'GET', '/api/ruta-fantasma');
    assert(r404.status === 404 && r404.body.success === false, 'Rutas desconocidas devuelven 404 JSON');

  } catch (err) {
    console.error('Error fatal durante la prueba:', err);
    failed++;
  } finally {
    server.close();
    console.log(`\n🏁 Resultado de las pruebas: ${passed} superadas, ${failed} fallidas.`);
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runTests();
