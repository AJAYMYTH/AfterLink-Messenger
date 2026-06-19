import { Client } from '@afterlink/browser';

const AFTERLINK_URL = import.meta.env.VITE_AFTERLINK_URL || 'ws://localhost:4001/ws';

let client = null;
let currentToken = null;

export function getClient() {
  return client;
}

export function isConnected() {
  return client ? client.isConnected() : false;
}

export async function connect(token = null) {
  if (client) {
    await disconnect();
  }
  currentToken = token;
  client = new Client(AFTERLINK_URL, {
    auth: token,
    autoReconnect: true,
    maxReconnectAttempts: 10,
    reconnectDelay: 1000,
    pingInterval: 30000,
  });
  await client.connect();
  return client;
}

export async function disconnect() {
  if (client) {
    await client.disconnect();
    client = null;
    currentToken = null;
  }
}

export async function request(route, body) {
  if (!client) throw new Error('Not connected');
  return client.request(route, body);
}

export async function subscribe(topic, callback) {
  if (!client) throw new Error('Not connected');
  return client.subscribe(topic, callback);
}

export async function publish(topic, data) {
  if (!client) throw new Error('Not connected');
  return client.publish(topic, data);
}
