let jwt = require('jsonwebtoken');
let config = require('../config/index');

module.exports = function authMiddleware(req, res, next) {
  try {
    let header = req.headers.authorization || req.headers.Authorization || '';
    if (!header) return res.status(401).json({ message: 'Authorization header missing' });

    let parts = header.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ message: 'Invalid authorization format' });
    }

    let token = parts[1];
    let payload;
    try {
      payload = jwt.verify(token, config.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    req.user = {
      id: payload.id,
      role: payload.role,
      email: payload.email,
      iat: payload.iat,
      exp: payload.exp
    };

    return next();
  } catch (err) {
    return next(err);
  }
};
