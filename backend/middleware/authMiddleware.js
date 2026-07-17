const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // Obtener la cabecera Authorization
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ error: 'Acceso denegado. No se proporcionó token de autenticación' });
  }

  // Separar el token según el formato estándar "Bearer <token>"
  const partes = authHeader.split(' ');
  if (partes.length !== 2 || partes[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Acceso denegado. Formato de token inválido (debe ser: Bearer token)' });
  }

  const token = partes[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error('Error de configuración: JWT_SECRET no está definida');
    return res.status(500).json({ error: 'Error de configuración en el servidor' });
  }

  try {
    // Validar y decodificar el token
    const decodificado = jwt.verify(token, secret);
    req.user = decodificado; // Adjuntar el usuario decodificado a la petición para rutas posteriores
    return next();
  } catch (error) {
    console.error('Error de verificación JWT:', error.message);
    return res.status(403).json({ error: 'Token de autenticación inválido o expirado' });
  }
};
