require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const stringSimilarity = require('string-similarity');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON en las peticiones
app.use(express.json());

// Conexión a MongoDB (controlar error de manera que no detenga el arranque local si no hay .env aún)
connectDB().catch((err) => {
  console.warn('Aviso: No se pudo conectar a MongoDB de forma inicial (rellena tu archivo .env):', err.message);
});

// Rutas de autenticación
app.use('/api/auth', authRoutes);

// Comandos esperados por el ESP32 para controlar el brazo robótico
const COMANDOS_VALIDOS = [
  'abrir', 
  'cerrar', 
  'subir', 
  'bajar', 
  'izquierda', 
  'derecha', 
  'adelante', 
  'atras'
];

// Ruta para procesamiento de voz con matching difuso
app.post('/api/comando', (req, res) => {
  try {
    const { texto } = req.body;
    if (!texto) {
      return res.status(400).json({ error: 'El campo "texto" es requerido en el cuerpo de la petición' });
    }

    const textoNormalizado = texto.toLowerCase().trim();

    // Matching difuso usando string-similarity
    const matches = stringSimilarity.findBestMatch(textoNormalizado, COMANDOS_VALIDOS);
    const bestMatch = matches.bestMatch;

    // Umbral mínimo de similitud (ej. 40%) para aceptar el comando
    const UMBRAL = 0.4;

    if (bestMatch.rating >= UMBRAL) {
      return res.status(200).json({
        original: texto,
        command: bestMatch.target,
        similitud: bestMatch.rating
      });
    } else {
      return res.status(200).json({
        original: texto,
        command: 'desconocido',
        similitud: bestMatch.rating
      });
    }
  } catch (error) {
    console.error('Error en procesamiento de comando:', error);
    return res.status(500).json({ error: 'Error interno al procesar el comando' });
  }
});

// Endpoint de verificación de estado (Health Check)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Backend de brazo robótico A-ARM funcionando correctamente',
    mongodbConnection: require('mongoose').connection.readyState === 1 ? 'Conectado' : 'Desconectado'
  });
});

// Iniciar servidor local si no estamos en producción serverless
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`[A-ARM Backend] Servidor corriendo en http://localhost:${PORT}`);
  });
}

// Exportar la app para compatibilidad con Vercel serverless
module.exports = app;
