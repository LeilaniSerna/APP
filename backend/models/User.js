const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'El correo electrónico es obligatorio'],
    unique: true,
    lowercase: true,
    trim: true,
    // Validación de formato de email
    match: [/^\S+@\S+\.\S+$/, 'Por favor ingresa un correo electrónico válido']
  },
  password: {
    type: String,
    required: [true, 'La contraseña es obligatoria'],
    minlength: [8, 'La contraseña debe tener al menos 8 caracteres']
  },
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true
  },
  rol: {
    type: String,
    enum: {
      values: ['usuario', 'admin'],
      message: '{VALUE} no es un rol permitido'
    },
    default: 'usuario'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hook pre-save para hashear la contraseña automáticamente
userSchema.pre('save', async function (next) {
  const user = this;

  // Solo hashear la contraseña si es nueva o ha sido modificada
  if (!user.isModified('password')) return next();

  try {
    // Generar la sal y hashear el password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Método de instancia para comparar contraseñas durante el login
userSchema.methods.compararPassword = async function (candidataPassword) {
  try {
    return await bcrypt.compare(candidataPassword, this.password);
  } catch (err) {
    throw new Error(err);
  }
};

module.exports = mongoose.model('User', userSchema);
