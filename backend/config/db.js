const mongoose = require('mongoose');

// Declarar variable para almacenar la promesa de conexión y reutilizarla
let cachedPromise = null;

const connectDB = async () => {
  // Si la conexión ya está activa (readyState 1 = conectado, 2 = conectando)
  if (mongoose.connection.readyState >= 1) {
    console.log('=> Reutilizando conexión existente a MongoDB');
    return mongoose.connection;
  }

  // Verificar que la variable de entorno esté definida
  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI no está definida en las variables de entorno (.env)');
    throw new Error('MONGODB_URI es requerida para conectar a la base de datos');
  }

  // Si no hay promesa de conexión en cache, crear una nueva
  if (!cachedPromise) {
    const opts = {
      bufferCommands: false, // Desactivar el almacenamiento en búfer si la conexión se cae
    };

    console.log('=> Iniciando nueva conexión a MongoDB...');
    cachedPromise = mongoose.connect(process.env.MONGODB_URI, opts)
      .then((mongooseInstance) => {
        console.log('=> Conexión a MongoDB establecida exitosamente');
        return mongooseInstance;
      })
      .catch((err) => {
        console.error('=> Error al conectar a MongoDB:', err.message);
        cachedPromise = null; // Limpiar caché en caso de fallo para permitir reintentos
        throw err;
      });
  }

  return cachedPromise;
};

module.exports = connectDB;
