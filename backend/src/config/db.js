/**
 * Food Express API — MongoDB connection.
 */
'use strict';

const mongoose = require('mongoose');
const { env } = require('./env');

let connection = null;

/**
 * Without a connection, mongoose buffers queries for ~10s before failing. Turn
 * buffering off so the dbGuard answer (503 DATABASE_UNAVAILABLE) is immediate.
 */
if (!env.mongoUri || env.allowWithoutDatabase) {
  mongoose.set('bufferCommands', false);
}

async function connect(uri) {
  const target = uri || env.mongoUri;
  if (!target) throw new Error('MONGO_URI is not configured.');
  mongoose.set('strictQuery', true);
  connection = await mongoose.connect(target, {
    serverSelectionTimeoutMS: 8000,
    maxPoolSize: 10,
  });
  return connection;
}

async function disconnect() {
  if (!connection) return;
  await mongoose.disconnect();
  connection = null;
}

function isConnected() {
  return Boolean(connection && mongoose.connection.readyState === 1);
}

module.exports = { connect, disconnect, isConnected, mongoose };
