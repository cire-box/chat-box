const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { startDiscoveryServer, broadcastAnnounce } = require('./discovery');
const db = require('./database');
db.initDatabase();

const WS_PORT = 8766;
const HTTP_PORT = 8765;
const HTTPS_PORT = 8443;

const SSL_KEY = fs.readFileSync(path.join(__dirname, 'ssl', 'key.pem'));
const SSL_CERT = fs.readFileSync(path.join(__dirname, 'ssl', 'cert.pem'));

const clients = new Map();

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

function getLocalIP() {
  const envIP = process.env.SERVER_IP;
  if (envIP) return envIP;

  try {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch (e) {}

  try {
    const { execSync } = require('child_process');
    const result = execSync("ip route | grep -i wlan0 | awk '{print $9}' | head -1", { encoding: 'utf8' });
    if (result.trim()) return result.trim();
  } catch (e) {}

  try {
    const { execSync } = require('child_process');
    const result = execSync("ip route | grep -i eth0 | awk '{print $9}' | head -1", { encoding: 'utf8' });
    if (result.trim()) return result.trim();
  } catch (e) {}

  return null;
}

const NAME_COLORS = [
  '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', 
  '#2196f3', '#03a9f4', '#00bcd4', '#009688',
  '#4caf50', '#8bc34a', '#ff9800', '#ff5722'
];

function getNameColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return NAME_COLORS[Math.abs(hash) % NAME_COLORS.length];
}

function parseTextFormatting(text) {
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  
  return text
    .replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/(^|\s)@(\w+)/g, (match, prefix, username) => {
      const color = getNameColor(username);
      return `${prefix}<span class="mention" style="color:${color}">@${username}</span>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<b>$1</b>')
    .replace(/_([^_]+)_/g, '<i>$1</i>')
    .replace(/~([a-zA-Z0-9][^~\n]*?)~/g, '<del>$1</del>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, '..', 'web', filePath);

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'text/plain';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end('500 Internal Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

const wss = new WebSocket.Server({ server: server });

wss.on('connection', (ws, req) => {
  const clientIP = req.socket.remoteAddress;
  console.log(`[WS] Nova conexão de: ${clientIP}`);
  
  let clientName = null;
  let clientId = null;

  ws.on('message', (data) => {
    try {
      const rawMsg = JSON.parse(data);
      const msg = { ...rawMsg };

      switch (msg.type) {
        case 'join':
          clientId = msg.id || Date.now().toString(36) + Math.random().toString(36).substr(2);
          clientName = msg.name || 'Anónimo';
          
          const device = db.getOrCreateDevice(clientId, clientName);
          clients.set(ws, { id: clientId, name: clientName, ip: clientIP });
          
          broadcastUserList();
          broadcastSystemMessage(`${clientName} entrou no chat`);
          
          const messages = db.getAllMessages();
          
          const initMessages = messages
            .map(m => ({
              ...m,
              is_own: m.device_id === clientId ? 1 : 0,
              name_color: getNameColor(m.device_name)
            }))
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          
          ws.send(JSON.stringify({
            type: 'init',
            device_id: clientId,
            device_name: clientName,
            name_color: getNameColor(clientName),
            messages: initMessages
          }));
          break;

        case 'message':
          if (!clientName || !clientId) return;
          
          const formattedText = parseTextFormatting(msg.text);
          const nameColor = getNameColor(clientName);
          const message = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            device_id: clientId,
            device_name: clientName,
            name_color: nameColor,
            content: formattedText,
            original_content: msg.text,
            image: msg.image || null,
            audio: msg.audio || null,
            file: msg.file || null,
            file_name: msg.file_name || null,
            file_type: msg.file_type || null,
            file_size: msg.file_size || null,
            is_own: true,
            timestamp: new Date().toISOString()
          };
          
          db.saveMessage({
            ...message,
            is_own: 1
          });
          
          broadcastToOthers(ws, clientId, {
            type: 'message',
            ...message,
            is_own: 0
          });
          
          ws.send(JSON.stringify({
            type: 'message',
            ...message,
            is_own: 1
          }));
          break;

        case 'clear_chat':
          db.clearAllMessages();
          broadcast({ type: 'chat_cleared' });
          break;

        case 'typing':
          broadcastToOthers(ws, clientId, { type: 'typing', name: clientName });
          break;

        case 'call_request':
          if (!clientName || !clientId) return;
          broadcastToOthers(ws, clientId, {
            type: 'call_request',
            from: clientName,
            from_id: clientId,
            call_type: msg.call_type || 'video'
          });
          break;

        case 'call_answer':
          if (!clientName || !clientId) return;
          broadcastToOthers(ws, clientId, {
            type: 'call_answer',
            from: clientName,
            from_id: clientId,
            accepted: msg.accepted
          });
          break;

        case 'call_ice':
          broadcastToOthers(ws, clientId, {
            type: 'call_ice',
            from_id: clientId,
            candidate: msg.candidate
          });
          break;

        case 'call_end':
          broadcastToOthers(ws, clientId, {
            type: 'call_end',
            from_id: clientId
          });
          break;

        case 'message_read':
          broadcastToOthers(ws, clientId, {
            type: 'message_read',
            message_id: msg.message_id,
            reader_id: clientId
          });
          break;

        case 'toggle_favorite':
          if (!clientId) return;
          const favNew = db.toggleFavorite(msg.message_id, clientId);
          const favMsg = db.getMessages(msg.message_id);
          broadcast({ type: 'message_updated', message_id: msg.message_id, is_favorite: favNew, message: favMsg });
          break;

        case 'toggle_pinned':
          if (!clientId) return;
          const pinnedNew = db.togglePinned(msg.message_id, clientId);
          const pinnedMsg = db.getMessages(msg.message_id);
          broadcast({ type: 'message_updated', message_id: msg.message_id, is_pinned: pinnedNew, message: pinnedMsg });
          break;

        case 'delete':
          console.log('[DELETE] Received delete request:', msg);
          console.log('[DELETE] clientId:', clientId);
          if (!clientId) return;
          const deleted = db.deleteMessage(msg.id, clientId);
          console.log('[DELETE] Result:', deleted);
          if (deleted) {
            broadcast({ type: 'message_deleted', id: msg.id });
          }
          break;
      }
    } catch (e) {
      console.error('Erro ao processar mensagem:', e);
    }
  });

  ws.on('close', () => {
    const client = clients.get(ws);
    if (client) {
      db.setDeviceOffline(client.id);
      broadcastSystemMessage(`${client.name} saiu do chat`);
      clients.delete(ws);
      broadcastUserList();
    }
  });
});

function broadcastToAll(message) {
  const data = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

function broadcastToOthers(sender, senderId, message) {
  const data = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

function broadcastUserList() {
  const users = [];
  wss.clients.forEach(client => {
    const c = clients.get(client);
    if (c) users.push({ id: c.id, name: c.name });
  });
  broadcastToAll({ type: 'user_list', users });
}

function broadcastSystemMessage(text) {
  broadcastToAll({
    type: 'system',
    text: text,
    timestamp: new Date().toISOString()
  });
}

function broadcast(msg) {
  broadcastToAll(msg);
}

// HTTPS handled by nginx on port 8443

const localIP = getLocalIP();
console.log(`
╔═══════════════════════════════════════════╗
║         CHATBOX - Servidor          ║
╠═══════════════════════════════════════════╣
║  Acesse de outro dispositivo:            ║
║                                           ║
║  ► https://localhost:8443 (este dispositivo)  ║
║  ► https://${localIP || '<IP>'}:8443 (outros dispositivos) ║
║                                           ║
║  WebSocket: wss://localhost:8443             ║
║                                           ║
║  HTTP (sem chamadas): http://localhost:${HTTP_PORT}     ║
╚═══════════════════════════════════════════╝
`);

startDiscoveryServer(WS_PORT);
broadcastAnnounce(WS_PORT);

server.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`[HTTP] Servidor HTTP rodando na porta ${HTTP_PORT} (sem HTTPS - chamadas desativadas)`);
});
