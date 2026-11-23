---
name: api-rest
description: >-
  Guía de buenas prácticas y estándares de desarrollo para la creación de endpoints y APIs RESTful con Node.js, Express y SQLite. Úsalo al diseñar o implementar rutas, controladores, validaciones, códigos HTTP, seguridad, transacciones de base de datos e integridad referencial.
---

# Skill: Buenas Prácticas para API REST (Node.js + Express + SQLite)

Esta Skill define los estándares de arquitectura, diseño de endpoints, validaciones, control de errores y manipulación de datos en SQLite que deben seguirse obligatoriamente al desarrollar la capa backend de la aplicación.

---

## 1. Diseño de Rutas y Nomenclatura RESTful

1. **Uso de sustantivos en plural para recursos:**
   * `/api/instalaciones` (correcto) vs `/api/getInstalacion` (incorrecto).
   * Recursos anidados cuando haya jerarquía directa: `/api/instalaciones/:id/equipos` o filtros por query: `/api/equipos?instalacion_id=:id`.

2. **Verbos HTTP semánticos:**
   * `GET`: Recuperación de recursos (idempotente, seguro, sin efectos secundarios).
   * `POST`: Creación de un nuevo recurso. Devuelve `201 Created` con el recurso creado o su ID.
   * `PUT`: Actualización completa o modificación sustancial del recurso.
   * `DELETE`: Eliminación del recurso. Devuelve `200 OK` con confirmación o `204 No Content`.

3. **Respuestas JSON consistentes:**
   Toda respuesta debe seguir un formato estandarizado:
   ```json
   // Éxito
   {
     "success": true,
     "data": { ... } // o [ ... ]
   }

   // Error
   {
     "success": false,
     "error": "Descripción legible del error",
     "details": [ ... ] // Opcional
   }
   ```

---

## 2. Códigos de Estado HTTP

* `200 OK`: Operación de consulta, actualización o eliminación ejecutada con éxito.
* `201 Created`: Nuevo registro creado con éxito (acompañado del ID y datos creados).
* `400 Bad Request`: Datos de entrada inválidos, campos obligatorios omitidos o tipos incorrectos.
* `404 Not Found`: El recurso solicitado por ID no existe en la base de datos.
* `409 Conflict`: Conflicto de unicidad (ej. código de serie de equipo ya existente).
* `500 Internal Server Error`: Excepción no controlada en el servidor (capturada sin filtrar datos confidenciales).

---

## 3. Validación y Sanitización de Datos

1. **Validación previa a la consulta:**
   * Verificar la presencia de campos requeridos (`trim()` en cadenas de texto para evitar espacios vacíos).
   * Validar tipos de datos (identificadores numéricos enteros positivos, enumerados válidos).
   * Validar que los valores de tipo `CHECK` pertenezcan a las listas permitidas (ej. `prioridad IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')`).

2. **Validación de identificadores de ruta:**
   ```javascript
   const id = parseInt(req.params.id, 10);
   if (isNaN(id) || id <= 0) {
     return res.status(400).json({ success: false, error: 'Identificador inválido' });
   }
   ```

---

## 4. Consultas SQLite e Integridad de Datos

1. **Consultas parametrizadas obligatorias:**
   * **NUNCA** concatenar variables en cadenas SQL para evitar inyección SQL (SQL Injection).
   * Usar siempre placeholders `?` en `prepare()`:
     ```javascript
     // Correcto
     const stmt = db.prepare('SELECT * FROM equipos WHERE id = ?');
     const equipo = stmt.get(id);

     // INCORRECTO (vulnerable)
     // db.prepare(`SELECT * FROM equipos WHERE id = ${id}`).get();
     ```

2. **Garantía de claves foráneas:**
   * Asegurar que la conexión siempre active claves foráneas: `PRAGMA foreign_keys = ON;`.
   * Manejar excepciones de SQLite para violaciones de integridad:
     * `FOREIGN KEY constraint failed`: responder con `400 Bad Request` indicando que la entidad padre no existe.
     * `UNIQUE constraint failed`: responder con `409 Conflict` indicando duplicidad.

3. **Uso de Transacciones:**
   * Cuando una operación afecte a varias tablas o requiera coherencia estricta (ej. registrar una avería crítica y cambiar a la vez el estado del equipo a `AVERIADO`), encapsular las sentencias en una transacción:
     ```javascript
     db.exec('BEGIN');
     try {
       insertIncidencia.run(...);
       updateEquipoEstado.run('AVERIADO', equipoId);
       db.exec('COMMIT');
     } catch (err) {
       db.exec('ROLLBACK');
       throw err;
     }
     ```

---

## 5. Control de Errores y Middleware en Express

1. **Estructura modular de controladores:**
   * Cada controlador debe envolver su lógica en bloques `try...catch` o delegar al middleware centralizado mediante `next(error)`.
2. **Middleware global de manejo de errores:**
   * Debe capturar errores no gestionados y devolver JSON con status 500.
3. **Manejo de rutas no encontradas (404):**
   * Configurar un middleware final para rutas no coincidentes que devuelva un 404 en formato JSON.
