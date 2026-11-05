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

const MEDIA_ROUTE = /^\/media\/([A-Za-z0-9]+)\/(image|audio|file)$/;
const INLINE_MEDIA_TYPE = /^(image\/(png|jpeg|gif|webp|bmp|avif)|audio\/[\w.+-]+)$/i;

// Serve a mídia de uma mensagem (guardada como data URL) como binário, para o
// navegador baixar sob demanda e cachear. O id da mensagem nunca muda de
// conteúdo, então o cache pode ser permanente.
function serveMedia(req, res, messageId, field) {
  const dataUrl = db.getMessageMedia(messageId, field);
  const parsed = dataUrl && /^data:([^,]*?)(;base64)?,(.*)$/s.exec(dataUrl);
  if (!parsed) {
    res.writeHead(404);
    res.end('404 Not Found');
    return;
  }

  const [, meta, isBase64, payload] = parsed;
  let body;
  try {
    body = isBase64 ? Buffer.from(payload, 'base64') : Buffer.from(decodeURIComponent(payload));
  } catch (e) {
    res.writeHead(500);
    res.end('500 Internal Server Error');
    return;
  }
  const mime = meta.split(';')[0].trim();

  // O tipo vem do upload do usuário e é servido na mesma origem do app:
  // só imagem/áudio conhecidos vão inline; o resto vira download, e o
  // sandbox impede que um HTML/SVG aberto direto execute script.
  const inline = field !== 'file' && INLINE_MEDIA_TYPE.test(mime);
  const headers = {
    'Content-Type': inline ? mime : 'application/octet-stream',
    'Cache-Control': 'private, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Accept-Ranges': 'bytes'
  };
  if (!inline) headers['Content-Disposition'] = 'attachment';

  // Range: o Safari exige para tocar <audio>, e permite avançar o áudio.
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (range && (range[1] || range[2])) {
    const size = body.length;
    let start = range[1] ? parseInt(range[1], 10) : size - parseInt(range[2], 10);
    let end = range[1] && range[2] ? parseInt(range[2], 10) : size - 1;
    start = Math.max(0, start);
    end = Math.min(end, size - 1);
    if (start > end) {
      res.writeHead(416, { 'Content-Range': `bytes */${size}` });
      res.end();
      return;
    }
    headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
    headers['Content-Length'] = end - start + 1;
    res.writeHead(206, headers);
    res.end(req.method === 'HEAD' ? undefined : body.subarray(start, end + 1));
    return;
  }

  headers['Content-Length'] = body.length;
  res.writeHead(200, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
}

const REPLY_TEXT_MAX = 140;

// Citação de uma resposta, montada a partir da mensagem original no banco
// (não do que o cliente mandou). {} se não há resposta ou a original sumiu.
function buildReply(replyToId) {
  if (typeof replyToId !== 'string' || !replyToId) return {};
  const source = db.getReplySource(replyToId);
  if (!source) return {};

  let text = (source.content || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (source.has_image) text = '📷 Foto';
  else if (source.has_audio) text = '🎤 Áudio';
  else if (source.has_file) text = `📎 ${source.file_name || 'Arquivo'}`;
  if (text.length > REPLY_TEXT_MAX) text = text.slice(0, REPLY_TEXT_MAX - 1) + '…';

  return {
    reply_to: source.id,
    reply_to_name: source.device_name,
    reply_to_text: text
  };
}

const server = http.createServer((req, res) => {
  const mediaMatch = MEDIA_ROUTE.exec(req.url);
  if (mediaMatch) {
    serveMedia(req, res, mediaMatch[1], mediaMatch[2]);
    return;
  }

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
              name_color: getNameColor(m.device_name),
              reply_to_color: m.reply_to_name ? getNameColor(m.reply_to_name) : null
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
          const reply = buildReply(msg.reply_to);
          const message = {
            ...reply,
            reply_to_color: reply.reply_to_name ? getNameColor(reply.reply_to_name) : null,
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
