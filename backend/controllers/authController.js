const User = require('../models/User');
const jwt = require('jsonwebtoken');
const connectDB = require('../config/db');

// Función helper para generar JWT con expiración de 7 días
const generarToken = (user) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no está configurada en las variables de entorno');
  }
  return jwt.sign(
    { id: user._id, email: user.email, rol: user.rol },
    secret,
    { expiresIn: '7d' } // Expira en 7 días
  );
};

// Registro de usuario
exports.register = async (req, res) => {
  try {
    // Asegurar la conexión activa a MongoDB Atlas en entornos Serverless
    await connectDB();

    const { email, password, nombre, rol } = req.body;

    // Validación de campos requeridos básica
    if (!email || !password || !nombre) {
      return res.status(400).json({ error: 'El nombre, correo electrónico y contraseña son obligatorios' });
    }

    // Verificar si el correo ya está registrado
    const usuarioExistente = await User.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
    }

    // Crear la instancia del usuario (el password se hashea automáticamente pre-save)
    const nuevoUsuario = new User({
      email,
      password,
      nombre,
      rol
    });

    // Guardar en la base de datos
    await nuevoUsuario.save();

    // Generar token JWT
    const token = generarToken(nuevoUsuario);

    // Responder con el token y datos del usuario creado (sin contraseña)
    return res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      usuario: {
        id: nuevoUsuario._id,
        nombre: nuevoUsuario.nombre,
        email: nuevoUsuario.email,
        rol: nuevoUsuario.rol,
        createdAt: nuevoUsuario.createdAt
      }
    });
  } catch (error) {
    console.error('Error en el controlador de registro:', error);
    
    // Capturar errores de validación de Mongoose (como formato de email o largo de password)
    if (error.name === 'ValidationError') {
      const mensajes = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ error: mensajes.join(', ') });
    }
    
    const mensajeError = error.message || 'Error interno del servidor al procesar el registro';
    return res.status(500).json({ error: mensajeError });
  }
};

// Inicio de sesión de usuario
exports.login = async (req, res) => {
  try {
    // Asegurar la conexión activa a MongoDB Atlas en entornos Serverless
    await connectDB();

    const { email, password } = req.body;

    // Validación básica de campos requeridos
    if (!email || !password) {
      return res.status(400).json({ error: 'El correo electrónico y la contraseña son obligatorios' });
    }

    // Buscar al usuario por correo
    const usuario = await User.findOne({ email });
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Comparar la contraseña ingresada con la hasheada en la base de datos
    const esPasswordValido = await usuario.compararPassword(password);
    if (!esPasswordValido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar token JWT
    const token = generarToken(usuario);

    // Responder con el token y datos del usuario
    return res.status(200).json({
      message: 'Inicio de sesión exitoso',
      token,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      }
    });
  } catch (error) {
    console.error('Error en el controlador de inicio de sesión:', error);
    const mensajeError = error.message || 'Error interno del servidor al procesar el inicio de sesión';
    return res.status(500).json({ error: mensajeError });
  }
};
