import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import instalacionesRoutes from './routes/instalaciones.routes.js';
import equiposRoutes from './routes/equipos.routes.js';
import incidenciasRoutes from './routes/incidencias.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend Vanilla
const publicPath = path.resolve(__dirname, '../public');
app.use(express.static(publicPath));

// Rutas de la API REST
app.use('/api/instalaciones', instalacionesRoutes);
app.use('/api/equipos', equiposRoutes);
app.use('/api/incidencias', incidenciasRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Endpoint de comprobación de salud (Health Check)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Contratia Mini operativa',
    timestamp: new Date().toISOString()
  });
});

// Middleware para rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
});

// Middleware global de manejo de errores (500)
app.use((err, req, res, next) => {
  console.error('❌ Error capturado en servidor:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Error interno del servidor'
  });
});

// Arrancar el servidor si se ejecuta directamente
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
    console.log(`📁 Frontend servido desde: ${publicPath}`);
  });
}

export default app;
