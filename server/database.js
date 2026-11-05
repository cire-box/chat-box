const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'cirebox.db');
const db = new Database(dbPath);

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_online INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      device_name TEXT,
      content TEXT,
      image TEXT,
      audio TEXT,
      file TEXT,
      file_name TEXT,
      file_type TEXT,
      file_size INTEGER,
      is_own INTEGER DEFAULT 0,
      is_favorite INTEGER DEFAULT 0,
      is_pinned INTEGER DEFAULT 0,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (device_id) REFERENCES devices(id)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_device ON messages(device_id);
    CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
  `);
  
  try {
    db.exec('ALTER TABLE messages ADD COLUMN is_favorite INTEGER DEFAULT 0');
  } catch (e) {}
  try {
    db.exec('ALTER TABLE messages ADD COLUMN is_pinned INTEGER DEFAULT 0');
  } catch (e) {}
  try {
    db.exec('ALTER TABLE messages ADD COLUMN audio TEXT');
  } catch (e) {}
  try {
    db.exec('ALTER TABLE messages ADD COLUMN file TEXT');
  } catch (e) {}
  try {
    db.exec('ALTER TABLE messages ADD COLUMN file_name TEXT');
  } catch (e) {}
  try {
    db.exec('ALTER TABLE messages ADD COLUMN file_type TEXT');
  } catch (e) {}
  try {
    db.exec('ALTER TABLE messages ADD COLUMN file_size INTEGER');
  } catch (e) {}
  // Resposta: id da mensagem citada + cópia do autor/trecho no momento da
  // resposta, para a citação continuar legível se a original sair do histórico.
  try {
    db.exec('ALTER TABLE messages ADD COLUMN reply_to TEXT');
  } catch (e) {}
  try {
    db.exec('ALTER TABLE messages ADD COLUMN reply_to_name TEXT');
  } catch (e) {}
  try {
    db.exec('ALTER TABLE messages ADD COLUMN reply_to_text TEXT');
  } catch (e) {}

  console.log('[DB] Banco de dados inicializado');
}

function getOrCreateDevice(id, name) {
  const existing = db.prepare('SELECT * FROM devices WHERE id = ?').get(id);
  
  if (existing) {
    db.prepare('UPDATE devices SET name = ?, last_seen = CURRENT_TIMESTAMP, is_online = 1 WHERE id = ?').run(name, id);
    return db.prepare('SELECT * FROM devices WHERE id = ?').get(id);
  }
  
  db.prepare('INSERT INTO devices (id, name, is_online) VALUES (?, ?, 1)').run(id, name);
  return db.prepare('SELECT * FROM devices WHERE id = ?').get(id);
}

function setDeviceOffline(id) {
  db.prepare('UPDATE devices SET is_online = 0, last_seen = CURRENT_TIMESTAMP WHERE id = ?').run(id);
}

function saveMessage(message) {
  const stmt = db.prepare(`
    INSERT INTO messages (id, device_id, device_name, content, image, audio, file, file_name, file_type, file_size, is_own, timestamp,
                          reply_to, reply_to_name, reply_to_text)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    message.id,
    message.device_id,
    message.device_name,
    message.content,
    message.image || null,
    message.audio || null,
    message.file || null,
    message.file_name || null,
    message.file_type || null,
    message.file_size || null,
    message.is_own ? 1 : 0,
    message.timestamp,
    message.reply_to || null,
    message.reply_to_name || null,
    message.reply_to_text || null
  );
}

// Dados mínimos da mensagem citada numa resposta, ou undefined.
function getReplySource(messageId) {
  return db.prepare(`
    SELECT id, device_name, content, file_name,
           image IS NOT NULL AS has_image,
           audio IS NOT NULL AS has_audio,
           file IS NOT NULL AS has_file
    FROM messages WHERE id = ?
  `).get(messageId);
}

function getMessages(deviceId, limit = 100) {
  return db.prepare(`
    SELECT * FROM messages 
    WHERE device_id = ?
    ORDER BY timestamp ASC
    LIMIT ?
  `).all(deviceId, limit);
}

function getAllConversations() {
  return db.prepare(`
    SELECT d.*, 
           (SELECT content FROM messages WHERE device_id = d.id ORDER BY timestamp DESC LIMIT 1) as last_message,
           (SELECT timestamp FROM messages WHERE device_id = d.id ORDER BY timestamp DESC LIMIT 1) as last_message_time,
           (SELECT COUNT(*) FROM messages WHERE device_id = d.id) as message_count
    FROM devices d
    WHERE d.id IN (SELECT DISTINCT device_id FROM messages)
    ORDER BY last_message_time DESC
  `).all();
}

function clearConversation(deviceId) {
  db.prepare('DELETE FROM messages WHERE device_id = ?').run(deviceId);
}

// Últimas `limit` mensagens, em ordem cronológica. Não traz o conteúdo das
// mídias (base64, pode somar MBs) — só has_* — o cliente busca via /media.
function getAllMessages(limit = 100) {
  return db.prepare(`
    SELECT id, device_id, device_name, content, file_name, file_type, file_size,
           is_own, is_favorite, is_pinned, timestamp,
           reply_to, reply_to_name, reply_to_text,
           image IS NOT NULL AS has_image,
           audio IS NOT NULL AS has_audio,
           file IS NOT NULL AS has_file
    FROM (
      SELECT * FROM messages
      ORDER BY timestamp DESC
      LIMIT ?
    )
    ORDER BY timestamp ASC
  `).all(limit);
}

const MEDIA_FIELDS = new Set(['image', 'audio', 'file']);

// Data URL guardada no campo de mídia da mensagem, ou null.
function getMessageMedia(messageId, field) {
  if (!MEDIA_FIELDS.has(field)) return null;
  const row = db.prepare(`SELECT ${field} AS data FROM messages WHERE id = ?`).get(messageId);
  return row ? row.data : null;
}

function clearAllMessages() {
  db.prepare('DELETE FROM messages').run();
}

function toggleFavorite(messageId, deviceId) {
  const msg = db.prepare('SELECT is_favorite FROM messages WHERE id = ?').get(messageId);
  if (msg) {
    const newValue = msg.is_favorite ? 0 : 1;
    db.prepare('UPDATE messages SET is_favorite = ? WHERE id = ?').run(newValue, messageId);
    return newValue;
  }
  return 0;
}

function togglePinned(messageId, deviceId) {
  const msg = db.prepare('SELECT is_pinned FROM messages WHERE id = ?').get(messageId);
  if (msg) {
    const newValue = msg.is_pinned ? 0 : 1;
    db.prepare('UPDATE messages SET is_pinned = ? WHERE id = ?').run(newValue, messageId);
    return newValue;
  }
  return 0;
}

function getPinnedMessages() {
  return db.prepare('SELECT * FROM messages WHERE is_pinned = 1 ORDER BY timestamp DESC').all();
}

function getFavoriteMessages(deviceId) {
  return db.prepare('SELECT * FROM messages WHERE is_favorite = 1 ORDER BY timestamp DESC').all();
}

function deleteMessage(messageId, deviceId) {
  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
  if (msg && msg.device_id === deviceId) {
    db.prepare('DELETE FROM messages WHERE id = ?').run(messageId);
    return true;
  }
  return false;
}

function getAllDevices() {
  return db.prepare('SELECT * FROM devices ORDER BY last_seen DESC').all();
}

function getOnlineDevices() {
  return db.prepare('SELECT * FROM devices WHERE is_online = 1 ORDER BY name').all();
}

function updateDeviceName(id, name) {
  db.prepare('UPDATE devices SET name = ? WHERE id = ?').run(name, id);
}

module.exports = {
  initDatabase,
  getOrCreateDevice,
  setDeviceOffline,
  saveMessage,
  getReplySource,
  getMessages,
  getAllMessages,
  getMessageMedia,
  getAllConversations,
  clearConversation,
  clearAllMessages,
  getAllDevices,
  getOnlineDevices,
  updateDeviceName,
  toggleFavorite,
  togglePinned,
  getPinnedMessages,
  getFavoriteMessages,
  deleteMessage,
  db
};
