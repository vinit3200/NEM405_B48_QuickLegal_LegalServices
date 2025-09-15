function permit(...allowedRoles) {
  let roles = allowedRoles.map(r => String(r));
  return (req, res, next) => {
    try {
      let user = req.user;
      if (!user) return res.status(401).json({ message: 'Unauthorized' });

      if (roles.length === 0) return next(); 

      if (!roles.includes(user.role)) {
        return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { permit };
