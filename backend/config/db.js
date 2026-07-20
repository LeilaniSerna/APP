const mongoose = require('mongoose');

// Declarar variable para almacenar la promesa de conexión y reutilizarla en Serverless
let cachedPromise = null;

const connectDB = async () => {
  // Solo reutilizar inmediatamente si la conexión está 100% LISTA (readyState 1 = conectado)
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // Verificar que la variable de entorno esté definida
  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI no está definida en las variables de entorno (.env)');
    throw new Error('MONGODB_URI es requerida para conectar a la base de datos');
  }

  // Si no hay promesa de conexión en caché, crear una nueva
  if (!cachedPromise) {
    console.log('=> Iniciando nueva conexión a MongoDB...');
    cachedPromise = mongoose.connect(process.env.MONGODB_URI)
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

  return await cachedPromise;
};

module.exports = connectDB;
