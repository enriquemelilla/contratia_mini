-- ==========================================================
-- Esquema de Base de Datos - Contratia Mini
-- ==========================================================

-- Habilitar claves foráneas
PRAGMA foreign_keys = ON;

-- Tabla 1: instalaciones
CREATE TABLE IF NOT EXISTS instalaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    direccion TEXT NOT NULL,
    tipo TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 2: equipos
CREATE TABLE IF NOT EXISTS equipos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instalacion_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    codigo_serie TEXT UNIQUE NOT NULL,
    tipo_equipo TEXT NOT NULL,
    estado TEXT CHECK(estado IN ('OPERATIVO', 'AVERIADO', 'EN_MANTENIMIENTO')) DEFAULT 'OPERATIVO',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (instalacion_id) REFERENCES instalaciones(id) ON DELETE CASCADE
);

-- Tabla 3: incidencias
CREATE TABLE IF NOT EXISTS incidencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipo_id INTEGER NOT NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    prioridad TEXT CHECK(prioridad IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')) DEFAULT 'MEDIA',
    estado TEXT CHECK(estado IN ('ABIERTA', 'EN_PROGRESO', 'RESUELTA', 'CERRADA')) DEFAULT 'ABIERTA',
    fecha_reporte DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion DATETIME NULL,
    FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE
);

-- Índices para optimizar búsquedas y claves foráneas
CREATE INDEX IF NOT EXISTS idx_equipos_instalacion ON equipos(instalacion_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_equipo ON incidencias(equipo_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_estado ON incidencias(estado);
