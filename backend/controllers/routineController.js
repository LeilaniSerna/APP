const Routine = require('../models/Routine');
const connectDB = require('../config/db');

// Obtener todas las rutinas del usuario autenticado
exports.getRoutines = async (req, res) => {
  try {
    await connectDB();
    const userId = req.user.id;
    let routines = await Routine.find({ userId }).sort({ createdAt: -1 });

    // Si el usuario recién creado aún no tiene rutinas, creamos las rutinas por defecto
    if (routines.length === 0) {
      const defaultRoutines = [
        {
          userId,
          titulo: 'Acercar Medicamento',
          categoria: 'ASISTENCIA MÉDICA',
          comandos: ['abrir', 'derecha', 'bajar', 'cerrar', 'arriba', 'izquierda']
        },
        {
          userId,
          titulo: 'Ensamblaje de Pieza',
          categoria: 'USO INDUSTRIAL',
          comandos: ['bajar', 'cerrar', 'arriba', 'derecha', 'abajo', 'abrir']
        }
      ];

      routines = await Routine.insertMany(defaultRoutines);
    }

    return res.json(routines);
  } catch (error) {
    console.error('Error al obtener rutinas:', error.message);
    return res.status(500).json({ error: 'Error al obtener las rutinas del servidor' });
  }
};

// Crear una nueva rutina para el usuario autenticado
exports.createRoutine = async (req, res) => {
  try {
    await connectDB();
    const { titulo, categoria, comandos } = req.body;

    if (!titulo || !comandos || !Array.isArray(comandos) || comandos.length === 0) {
      return res.status(400).json({ error: 'El título y una lista válida de comandos son obligatorios' });
    }

    const newRoutine = new Routine({
      userId: req.user.id,
      titulo,
      categoria: categoria || 'ASISTENCIA MÉDICA',
      comandos
    });

    await newRoutine.save();
    return res.status(201).json(newRoutine);
  } catch (error) {
    console.error('Error al crear rutina:', error.message);
    return res.status(500).json({ error: 'Error al guardar la rutina' });
  }
};
