'use strict';

let express = require('express');
let helmet = require('helmet');
let cors = require('cors');
let path = require('path');

let config = require('./config/index');
let routes = require('./routes/index');
let errorHandler = require('./middlewares/error.middleware');
let rateLimit = require('./middlewares/rateLimit.middleware');
let logger = require('./utils/logger');

let app = express();

app.use(helmet());

let corsOptions = {
  origin: (origin, cb) => {
    if (!origin || config.NODE_ENV === 'development') return cb(null, true);
    return cb(null, true);
  },
  credentials: true
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.use((req, res, next) => {
  let start = Date.now();
  res.on('finish', () => {
    let duration = Date.now() - start;
    logger.info('http.access', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: duration,
      ip: req.ip || req.connection?.remoteAddress
    });
  });
  next();
});

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));

let uploadsDir = path.resolve(process.cwd(), config.UPLOAD_DIR || 'uploads');
app.use('/uploads', express.static(uploadsDir, {
  index: false,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
  }
}));

app.use('/api', routes);

app.get('/', (req, res) => res.json({ status: 'ok', service: 'QuickLegal API', env: config.NODE_ENV }));

app.use(errorHandler);

module.exports = app;
