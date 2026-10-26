const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const env = require('./config/env');
const routes = require('./routes');
const openapi = require('./docs/openapi');
const { notFoundHandler, errorHandler } = require('./middlewares/error');

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigins }));
app.use(express.json({ limit: '100kb' }));
if (env.nodeEnv !== 'test') app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi));
app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
