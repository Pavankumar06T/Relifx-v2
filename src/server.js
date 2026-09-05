require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const { connectDb } = require('./config/db');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));

app.use('/api', require('./routes/health'));
app.use('/api/wearables', require('./routes/wearables'));
app.use('/api/ordering', require('./routes/ordering'));
app.use('/api/diagnostics', require('./routes/diagnostics'));
app.use('/api/consultation', require('./routes/consultation'));
app.use('/api/notifications', require('./routes/notifications'));

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: status === 500 ? 'Internal server error' : err.message });
});

const port = Number(process.env.PORT || 4000);

async function start() {
  try {
    await connectDb();
    app.listen(port, () => console.log(`ReLifeX integration service listening on :${port}`));
  } catch (err) {
    console.error('Failed to start', err);
    process.exit(1);
  }
}

if (require.main === module) start();

module.exports = { app, start };
