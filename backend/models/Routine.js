const mongoose = require('mongoose');

const RoutineSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El usuario es obligatorio']
  },
  titulo: {
    type: String,
    required: [true, 'El título de la rutina es obligatorio'],
    trim: true
  },
  categoria: {
    type: String,
    required: [true, 'La categoría es obligatoria'],
    default: 'ASISTENCIA MÉDICA',
    trim: true
  },
  comandos: {
    type: [String],
    required: [true, 'Los comandos son obligatorios'],
    validate: [arr => arr.length > 0, 'La rutina debe contener al menos un comando']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Routine', RoutineSchema);
