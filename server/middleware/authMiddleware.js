import jwt from 'jsonwebtoken';

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      req.user = decoded;
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

export const isolateWorkerData = (req, res, next) => {
  if (req.user && req.user.role === 'worker') {
    // Inject zoneId into the request query and body to ensure data isolation
    req.query.zoneId = req.user.zoneId;
    req.query.workerId = req.user.userId;
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      req.body.zoneId = req.user.zoneId;
      req.body.workerId = req.user.userId; // track which worker made the change
    }
  }
  next();
};
