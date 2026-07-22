// Vercel deployment update

// Cargar dotenv SOLAMENTE si estamos en entorno local (desarrollo)
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const routineRoutes = require('./routes/routineRoutes');
const stringSimilarity = require('string-similarity');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON y habilitar CORS
app.use(express.json());
app.use(cors());

// Variable para evitar reconexiones múltiples en Vercel Serverless
let isConnected = false;

// Middleware Asíncrono: Obliga a todas las peticiones a esperar la conexión a MongoDB
app.use(async (req, res, next) => {
  if (!isConnected) {
    try {
      await connectDB();
      isConnected = true;
      console.log('MongoDB conectado exitosamente a través del middleware');
    } catch (err) {
      console.error('Error al intentar conectar a MongoDB:', err.message);
      // Si la base de datos no conecta, frenamos la petición aquí devolviendo el error 500
      return res.status(500).json({ error: 'Error de conexión inicial con la base de datos' });
    }
  }
  next(); // Si ya está conectado o se acaba de conectar, continúa a la ruta que el usuario pidió
});

// Rutas de autenticación y rutinas de usuario
app.use('/api/auth', authRoutes);
app.use('/api/routines', routineRoutes);

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
    mongodbConnection: isConnected ? 'Conectado' : 'Desconectado'
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