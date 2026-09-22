const STORAGE_KEY = 'cirebox_username';
const DEVICE_ID_KEY = 'cirebox_device_id';

let ws = null;
let username = localStorage.getItem(STORAGE_KEY);
let deviceId = localStorage.getItem(DEVICE_ID_KEY);
let reconnectAttempts = 0;
const MAX_RECONNECT = 5;

const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const chatPlaceholder = document.getElementById('chat-placeholder');
const chatInputArea = document.getElementById('chat-input-area');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const audioBtn = document.getElementById('audio-btn');
const stopAudioBtn = document.getElementById('stop-audio-btn');
const audioRecording = document.getElementById('audio-recording');
const recordingTime = document.getElementById('recording-time');
const connectionStatus = document.getElementById('connection-status');

let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = null;
let recordingInterval = null;
const deviceNameElement = document.getElementById('device-name');
const searchBtn = document.getElementById('search-btn');

function getInputText() {
  return messageInput.textContent;
}

function setInputText(text) {
  messageInput.textContent = text;
}

function insertAtCursor(html) {
  messageInput.focus();
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  const frag = document.createRange().createContextualFragment(html);
  const lastNode = frag.lastChild;
  range.insertNode(frag);
  if (lastNode) {
    range.setStartAfter(lastNode);
    range.setEndAfter(lastNode);
  }
  sel.removeAllRanges();
  sel.addRange(range);
  messageInput.dispatchEvent(new Event('input', { bubbles: true }));
}

function htmlToMarkdown(el) {
  if (!el) return '';
  let result = '';
  el.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      const inner = htmlToMarkdown(node);
      if (tag === 'b' || tag === 'strong') {
        result += `*${inner}*`;
      } else if (tag === 'i' || tag === 'em') {
        result += `_${inner}_`;
      } else if (tag === 'del' || tag === 's') {
        result += `~${inner}~`;
      } else if (tag === 'code') {
        result += `\`${inner}\``;
      } else if (tag === 'br') {
        result += '\n';
      } else {
        result += inner;
      }
    }
  });
  return result;
}
const clearBtn = document.getElementById('clear-btn');
const discoverModal = document.getElementById('discover-modal');
const serverListDiv = document.getElementById('server-list');
const manualIpInput = document.getElementById('manual-ip');
const connectManualBtn = document.getElementById('connect-manual');
const closeModalBtn = document.getElementById('close-modal');
const fileInput = document.getElementById('file-input');
const confirmModal = document.getElementById('confirm-modal');
const confirmCancel = document.getElementById('confirm-cancel');
const confirmOk = document.getElementById('confirm-ok');
const searchModal = document.getElementById('search-modal');
const searchText = document.getElementById('search-text');
const searchUser = document.getElementById('search-user');
const searchResults = document.getElementById('search-results');
const searchFavorites = document.getElementById('search-favorites');
const closeSearch = document.getElementById('close-search');

function handleViewport() {
  const viewport = document.querySelector('meta[name="viewport"]');
  const chatScreen = document.getElementById('chat-screen');
  if (!chatScreen || chatScreen.classList.contains('hidden')) return;
  
  const keyboardHeight = window.innerHeight - document.documentElement.clientHeight;
  
  if (keyboardHeight > 0) {
    document.body.classList.add('keyboard-open');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, height=' + window.innerHeight + 'px');
    }
  } else {
    document.body.classList.remove('keyboard-open');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
    }
  }
}

window.addEventListener('resize', handleViewport);
window.addEventListener('focus', handleViewport);
window.addEventListener('blur', handleViewport);

const callAudioBtn = document.getElementById('call-audio-btn');
const callVideoBtn = document.getElementById('call-video-btn');
const incomingCallModal = document.getElementById('incoming-call-modal');
const incomingCallName = document.getElementById('incoming-call-name');
const incomingCallStatus = document.getElementById('incoming-call-status');
const acceptCallBtn = document.getElementById('accept-call-btn');
const rejectCallBtn = document.getElementById('reject-call-btn');
const callScreen = document.getElementById('call-screen');
const callPartnerName = document.getElementById('call-partner-name');
const callTypeLabel = document.getElementById('call-type-label');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const toggleMuteBtn = document.getElementById('toggle-mute-btn');
const toggleVideoBtn = document.getElementById('toggle-video-btn');
const endCallBtn = document.getElementById('end-call-btn');
const emojiBtn = document.getElementById('emoji-btn');
const emojiPicker = document.getElementById('emoji-picker');
const emojiGrid = document.getElementById('emoji-grid');
const emojiSearchInput = document.getElementById('emoji-search-input');

const EMOJI_CATEGORIES = {
  recent: ['👍', '❤️', '😊', '😂', '😘', '😍', '🎉', '🔥', '💯', '🙏', '👋', '😊', '😁', '😍', '🤔', '😅'],
  smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖'],
  animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🪲', '🪳', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🦣', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐈', '🐈‍⬛', '🪶', '🐓', '🦃', '🦤', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦫', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔'],
  food: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕', '🫖', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🧊'],
  activities: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '🤺', '⛹️', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🪘', '🎷', '🎺', '🪗', '🎸', '🪕', '🎻', '🪈', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰', '🧩', '🧸', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🌅', '🌄', '🌠', '🎇', '🎆', '🌃', '🌌', '🌉', '🌁'],
  travel: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '🪝', '⛽', '🚧', '🚦', '🚥', '🚏', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️', '🗻', '🏕️', '⛺', '🛖', '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🏛️', '⛪', '🕌', '🕍', '🛕', '🕋', '⛩️', '🛤️', '🛣️', '🗾', '🎑', '🏞️', '🌅', '🌄', '🌠', '🎇', '🎆', '🌃', '🌌', '🌉', '🌁'],
  objects: ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🪛', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🪚', '🔩', '⚙️', '🪤', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🪠', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🛀', '🧼', '🪥', '🪒', '🧽', '🪣', '🧴', '🛎️', '🔑', '🗝️', '🚪', '🪑', '🛋️', '🛏️', '🛌', '🧸', '🪆', '🖼️', '🪞', '🪟', '🛍️', '🛒', '🎁', '🎈', '🎏', '🎀', '🪄', '🪅', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷️', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃', '📄', '📑', '🧾', '📊', '📈', '📉', '🗒️', '🗓️', '📆', '📅', '🗑️', '📇', '🗃️', '🗳️', '🗄️', '📋', '📁', '📂', '🗂️', '🗞️', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖', '🧷', '🔗', '📎', '🖇️', '📐', '📏', '🧮', '📌', '📍', '✂️', '🖊️', '🖋️', '✒️', '🖌️', '🖍️', '📝', '✏️', '🔍', '🔎', '🔏', '🔐', '🔒', '🔓'],
  symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🛗', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '⚧️', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '⏏️', '▶️', '⏸️', '⏯️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '♾️', '💲', '💱', '™️', '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔝', '🔜', '✔️', '☑️', '🔘', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕', '📣', '📢', '💬', '💭', '🗯️', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛', '🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕤', '🕥', '🕦', '🕧']
};

let currentEmojiCategory = 'recent';

function renderEmojis(category) {
  currentEmojiCategory = category;
  const emojis = EMOJI_CATEGORIES[category] || EMOJI_CATEGORIES.recent;
  emojiGrid.innerHTML = '';
  emojis.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'emoji-btn';
    btn.textContent = emoji;
    btn.onclick = () => insertEmoji(emoji);
    emojiGrid.appendChild(btn);
  });
}

function insertEmoji(emoji) {
  insertAtCursor(emoji);
  emojiPicker.classList.add('hidden');
}

const EMOJI_KEYWORDS = {
  '😀': ['feliz', 'happy', 'sorriso', 'smile', 'alegre'],
  '😃': ['feliz', 'happy', 'sorriso', 'alegre'],
  '😄': ['rindo', 'laugh', 'feliz', 'alegre'],
  '😁': ['sorriso', 'smile', 'dente', 'happy'],
  '😆': ['rindo', 'laugh', 'muito', 'feliz'],
  '😅': ['nervoso', 'nervosa', 'sweat', 'tenso'],
  '🤣': ['rindo', 'laugh', 'morte', 'muito'],
  '😂': ['chore', 'cry', 'rir', 'lmao', 'rs'],
  '🙂': ['smile', 'sorriso', 'feliz'],
  '😊': ['feliz', 'happy', 'blush', 'tímido'],
  '😇': ['angel', 'anjo', 'bom', 'innocente'],
  '🥰': ['amor', 'love', 'apaixonado', 'coração'],
  '😍': ['amor', 'love', 'olhos', 'coração'],
  '🤩': ['estrela', 'star', 'olhos', 'apaixonado'],
  '😘': ['beijo', 'kiss', 'amor', 'coração'],
  '😗': ['kiss', 'beijo'],
  '😚': ['beijo', 'kiss', 'feliz'],
  '😙': ['beijo', 'kiss', 'smile'],
  '🥲': ['smile', 'sorriso', 'triste'],
  '😋': ['lingua', 'tongue', 'delicia', 'yum'],
  '😛': ['lingua', 'tongue', 'palhaço'],
  '😜': ['olho', 'piscando', 'wink', 'palhaço'],
  '🤪': ['maluco', 'crazy', 'louco'],
  '😝': ['lingua', 'tongue', 'dente'],
  '🤑': ['dinheiro', 'money', 'rico', 'dollar'],
  '🤗': ['abraço', 'hug', 'feliz'],
  '🤭': ['blush', 'tímido', 'vergonha'],
  '🤫': ['silencio', 'shh', 'calado'],
  '🤔': ['pensando', 'thinking', 'hmm'],
  '🤐': ['boca', 'mouth', 'silencio'],
  '😐': ['neutro', 'neutral', 'sem expressão'],
  '😑': ['neutro', 'neutral', 'sem'],
  '😶': ['boca', 'mouth', 'silencio'],
  '😏': ['sorriso', 'smile', 'malicioso'],
  '😒': ['entediado', 'bored', 'rolled'],
  '🙄': ['olhos', 'eyes', 'revirando'],
  '😬': ['nervoso', 'nervosa', 'awkward'],
  '🤥': ['mentira', 'lie', 'pinocchio'],
  '😌': ['aliviado', 'relieved', 'calmo'],
  '😔': ['triste', 'sad', 'pensando'],
  '😪': ['sono', 'sleepy', 'cansaço'],
  '🤤': ['baba', 'drool', 'fome'],
  '😴': ['dormindo', 'sleeping', 'zzz', 'sono'],
  '😷': ['mascara', 'mask', 'doente', 'gripe'],
  '🤒': ['doente', 'sick', 'febre'],
  '🤕': ['hurt', 'ferido', 'gesso'],
  '🤢': ['nausea', 'sick', 'vomito'],
  '🤮': ['vomito', 'vomit', 'doente'],
  '🤧': ['espirro', 'sneeze', 'accio'],
  '🥵': ['quente', 'hot', 'temperatura'],
  '🥶': ['frio', 'cold', 'congelado'],
  '🥴': ['tonto', 'dizzy', 'bêbado'],
  '😵': ['tonto', 'dizzy', 'vertigem'],
  '🤯': ['cabeça', 'head', 'explodindo'],
  '🤠': ['vaqueiro', 'cowboy', 'chapéu'],
  '🥳': ['festa', 'party', 'celebração'],
  '🥸': ['máscara', 'mask', 'disfarce'],
  '😎': ['legal', 'cool', 'oculos', 'descolado'],
  '🤓': ['nerd', 'oculos', 'inteligente'],
  '🧐': ['oculos', 'lente', 'investigando'],
  '😕': ['confuso', 'confused', 'triste'],
  '😟': ['preocupado', 'worried', 'triste'],
  '🙁': ['triste', 'sad', 'mal'],
  '☹️': ['triste', 'sad'],
  '😮': ['surpreso', 'surprised', 'uau'],
  '😯': ['surpreso', 'shocked', 'uau'],
  '😲': ['surpreso', 'shocked', 'uau'],
  '😳': ['vergonha', 'embarrassed', 'tímido'],
  '🥺': ['por favor', 'please', 'fofinho', 'puppy'],
  '😦': ['surpreso', 'shocked', 'aberto'],
  '😧': ['surpreso', 'shocked', 'uau'],
  '😨': ['medo', 'scared', 'assustado'],
  '😰': ['nervoso', 'nervosa', 'ansioso'],
  '😥': ['triste', 'sad', 'decepcionado'],
  '😢': ['triste', 'sad', 'chorando'],
  '😭': ['chorando', 'cry', 'choro', 'lloro'],
  '😱': ['medo', 'scared', 'gritando', 'socorro'],
  '😖': ['frustrado', 'frustrated', 'nervoso'],
  '😣': ['nervoso', 'nervosa', 'frustrado'],
  '😞': ['triste', 'sad', 'decepcionado'],
  '😓': ['suor', 'sweat', 'aliviado'],
  '😩': ['cansado', 'tired', 'exhausto'],
  '😫': ['cansado', 'tired', 'exhausto'],
  '🥱': ['bocejo', 'yawn', 'sono', 'tédio'],
  '😤': ['raiva', 'angry', 'bufando'],
  '😡': ['raiva', 'angry', 'bravo'],
  '😠': ['raiva', 'angry', 'bravo'],
  '🤬': ['palavrão', 'fuck', 'xingando'],
  '😈': ['diabo', 'devil', 'malvado'],
  '👿': ['diabo', 'devil', 'bravo'],
  '💀': ['morte', 'dead', 'caveira', 'morto'],
  '☠️': ['morte', 'dead', 'caveira'],
  '💩': ['merda', 'shit', 'cocô', 'fecal'],
  '🤡': ['palhaço', 'clown', 'idiota'],
  '👹': ['monstro', 'monster', 'demônio'],
  '👺': ['demônio', 'demon', 'japonês'],
  '👻': ['fantasma', 'ghost', 'halloween', 'assombrado'],
  '👽': ['alien', 'extraterrestre', 'ufo'],
  '👾': ['jogo', 'game', 'arcade'],
  '🤖': ['robo', 'robot', 'bot'],
  '🐶': ['cachorro', 'dog', 'pet', 'cão'],
  '🐱': ['gato', 'cat', 'pet', 'felino'],
  '🐭': ['rato', 'mouse', 'hamster'],
  '🐹': ['hamster', 'roedor', 'pet'],
  '🐰': ['coelho', 'bunny', 'easter', 'pet'],
  '🦊': ['raposa', 'fox', 'animal'],
  '🐻': ['urso', 'bear', 'animal'],
  '🐼': ['panda', 'bear', 'china', 'pet'],
  '🐨': ['koala', 'australia', 'animal'],
  '🐯': ['tigre', 'tiger', 'gato', 'bigode'],
  '🦁': ['leao', 'lion', 'animal', 'reis'],
  '🐮': ['vaca', 'cow', 'animal'],
  '🐷': ['porco', 'pig', 'animal'],
  '🐸': ['sapo', 'frog', 'animal', 'prince'],
  '🐵': ['macaco', 'monkey', 'animal'],
  '🐔': ['galinha', 'chicken', 'pássaro'],
  '🐧': ['pinguim', 'penguin', 'ave'],
  '🐦': ['pássaro', 'bird', 'ave', 'passaro'],
  '🐤': ['filhote', 'baby', 'pássaro'],
  '🦆': ['pato', 'duck', 'ave'],
  '🦅': ['aguia', 'eagle', 'ave', 'águia'],
  '🦉': ['coruja', 'owl', 'ave', 'sabio'],
  '🦇': ['morcego', 'bat', 'vampiro'],
  '🐺': ['lobo', 'wolf', 'animal'],
  '🐗': ['javali', 'boar', 'porco'],
  '🐴': ['cavalo', 'horse', 'animal', 'montaria'],
  '🦄': ['unicornio', 'unicorn', 'fantasia'],
  '🐝': ['abelha', 'bee', 'inseto', 'mel'],
  '🐛': ['lagarta', 'caterpillar', 'inseto'],
  '🦋': ['borboleta', 'butterfly', 'inseto', 'metamorfose'],
  '🐌': ['caracol', 'snail', 'lento'],
  '🐞': ['joaninha', 'ladybug', 'inseto'],
  '🐜': ['formiga', 'ant', 'inseto'],
  '🕷️': ['aranha', 'spider', 'inseto', 'aranha'],
  '🦂': ['escorpiao', 'scorpion', 'animal'],
  '🐢': ['tartaruga', 'turtle', 'animal', 'lento'],
  '🐍': ['cobra', 'snake', 'animal', 'reptil'],
  '🦎': ['lagarto', 'lizard', 'reptil'],
  '🦖': ['dinossauro', 'dinosaur', 't-rex'],
  '🦕': ['dinossauro', 'dinosaur', 'brontossauro'],
  '🐙': ['polvo', 'octopus', 'mar', 'oceano'],
  '🦑': ['lula', 'squid', 'mar', 'oceano'],
  '🦐': ['camarao', 'shrimp', 'mar', 'oceano'],
  '🦞': ['lagosta', 'lobster', 'mar'],
  '🦀': ['caranguejo', 'crab', 'cancer', 'mar'],
  '🐠': ['peixe', 'fish', 'aquario', 'mar'],
  '🐟': ['peixe', 'fish', 'aquario'],
  '🐬': ['golfinho', 'dolphin', 'mar', 'oceano'],
  '🐳': ['baleia', 'whale', 'mar', 'oceano'],
  '🐋': ['baleia', 'whale', 'mar'],
  '🦈': ['tubarao', 'shark', 'mar'],
  '🐊': ['crocodilo', 'crocodile', 'jacaré'],
  '🐅': ['tigre', 'tiger', 'animal'],
  '🐆': ['leopardo', 'leopard', 'animal'],
  '🦓': ['zebra', 'zebra', 'animal'],
  '🦍': ['gorila', 'gorilla', 'animal', 'macaco'],
  '🐘': ['elefante', 'elephant', 'animal', 'mem'],
  '🦛': ['hipopotamo', 'hippo', 'animal'],
  '🦏': ['rinoceronte', 'rhino', 'animal'],
  '🐪': ['camelo', 'camel', 'deserto'],
  '🐫': ['camelo', 'camel', 'deserto'],
  '🦒': ['girafa', 'giraffe', 'animal'],
  '🦘': ['canguru', 'kangaroo', 'australia'],
  '🦬': ['bisonte', 'bison', 'animal'],
  '🐃': ['bufalo', 'buffalo', 'animal'],
  '🐂': ['boi', 'ox', 'animal'],
  '🐄': ['vaca', 'cow', 'animal'],
  '🐎': ['cavalo', 'horse', 'animal'],
  '🐖': ['porco', 'pig', 'animal'],
  '🐏': ['carneiro', 'ram', 'animal'],
  '🐑': ['ovelha', 'sheep', 'animal'],
  '🐐': ['cabra', 'goat', 'animal'],
  '🦌': ['veado', 'deer', 'animal'],
  '🐕': ['cachorro', 'dog', 'pet', 'cão'],
  '🐩': ['poodle', 'dog', 'pet', 'cão'],
  '🐈': ['gato', 'cat', 'pet', 'felino'],
  '🐓': ['galo', 'rooster', 'galinha'],
  '🦃': ['peru', 'turkey', 'america'],
  '🦚': ['pavão', 'peacock', 'pássaro'],
  '🦜': ['papagaio', 'parrot', 'pássaro'],
  '🦢': ['cisne', 'swan', 'pássaro'],
  '🦩': ['flamingo', 'pássaro', 'rosa'],
  '🐇': ['coelho', 'bunny', 'easter', 'pet'],
  '🦝': ['guaxinim', 'raccoon', 'animal'],
  '🦦': ['lontra', 'otter', 'animal'],
  '🦥': ['preguiça', 'sloth', 'animal'],
  '🐿️': ['esquilo', 'squirrel', 'animal'],
  '🍎': ['maçã', 'apple', 'fruta', 'macã'],
  '🍐': ['pera', 'pear', 'fruta'],
  '🍊': ['laranja', 'orange', 'fruta', 'citrico'],
  '🍋': ['limão', 'lemon', 'citrico', 'azedo'],
  '🍌': ['banana', 'banana', 'fruta'],
  '🍉': ['melancia', 'watermelon', 'fruta', 'verão'],
  '🍇': ['uva', 'grape', 'fruta', 'vinho'],
  '🍓': ['morango', 'strawberry', 'fruta', 'doce'],
  '🍈': ['melão', 'melon', 'fruta'],
  '🍒': ['cereja', 'cherry', 'fruta', 'doce'],
  '🍑': ['pêssego', 'peach', 'fruta'],
  '🥭': ['manga', 'mango', 'fruta', 'india'],
  '🍍': ['abacaxi', 'pineapple', 'fruta', 'tropical'],
  '🥥': ['coco', 'coconut', 'fruta', 'tropical'],
  '🥝': ['kiwi', 'kiwi', 'fruta', 'doce'],
  '🍅': ['tomate', 'tomato', 'legume', 'verdura'],
  '🍆': ['berinjela', 'eggplant', 'vegetal'],
  '🥑': ['abacate', 'avocado', 'vegetal'],
  '🥦': ['brócolis', 'broccoli', 'vegetal', 'verde'],
  '🥬': ['alface', 'lettuce', 'vegetal', 'verde'],
  '🥒': ['pepino', 'cucumber', 'vegetal', 'verde'],
  '🌶️': ['pimenta', 'pepper', 'tempero', 'picante'],
  '🌽': ['milho', 'corn', 'vegetal', 'amarelo'],
  '🥕': ['cenoura', 'carrot', 'vegetal', 'laranja'],
  '🥔': ['batata', 'potato', 'vegetal', 'comida'],
  '🍠': ['batata doce', 'sweet potato', 'comida'],
  '🥐': ['croissant', 'pao', 'café'],
  '🥯': ['bagel', 'pao', 'café'],
  '🍞': ['pão', 'bread', 'comida'],
  '🥖': ['baguete', 'baguette', 'pao', 'frances'],
  '🥨': ['pretzel', 'pao', 'salgado'],
  '🧀': ['queijo', 'cheese', 'comida', 'laticinio'],
  '🥚': ['ovo', 'egg', 'comida', 'café'],
  '🍳': ['ovos', 'eggs', 'café', 'cafe'],
  '🥓': ['bacon', 'bacon', 'café', 'cafe'],
  '🥩': ['carne', 'steak', 'meat', 'comida'],
  '🍗': ['asa', 'wing', 'frango', 'comida'],
  '🍖': ['costela', 'ribs', 'meat', 'comida'],
  '🌭': ['hotdog', 'hot dog', 'salgado', 'lanche'],
  '🍔': ['hamburguer', 'hamburger', 'lanche', 'fastfood'],
  '🍟': ['batata frita', 'fries', 'fastfood', 'lanche'],
  '🍕': ['pizza', 'pizza', 'italiano', 'fastfood'],
  '🌮': ['taco', 'taco', 'mexicano'],
  '🌯': ['burrito', 'burrito', 'mexicano'],
  '🥗': ['salada', 'salad', 'verde', 'saudavel'],
  '🥘': ['panela', 'stew', 'comida'],
  '🍝': ['macarrao', 'pasta', 'italiano', 'espaguete'],
  '🍜': ['macarrao', 'noodles', 'lamen', 'japones'],
  '🍲': ['comida', 'food', 'panela'],
  '🍛': ['curry', 'indiano', 'tempero'],
  '🍣': ['sushi', 'sushi', 'japones', 'peixe'],
  '🍱': ['obento', 'bento', 'japones'],
  '🥟': ['dimsum', 'dumpling', 'chinês'],
  '🍤': ['tempura', 'fried', 'japones', 'peixe'],
  '🍙': ['bolinho', 'rice ball', 'japones'],
  '🍚': ['arroz', 'rice', 'comida', 'japones'],
  '🍘': ['biscoito', 'rice cracker', 'japones'],
  '🍥': ['peixe', 'fish cake', 'japones'],
  '🍧': [' shave ice', 'dessert', 'doce'],
  '🍨': ['sorvete', 'ice cream', 'dessert', 'doce'],
  '🍦': ['sorvete', 'ice cream', 'dessert'],
  '🥧': ['torta', 'pie', 'dessert', 'doce'],
  '🧁': ['cupcake', 'cupcake', 'doce', 'bolo'],
  '🍰': ['bolo', 'cake', 'doce', 'aniversario'],
  '🎂': ['bolo', 'birthday cake', 'aniversario', 'doce'],
  '🍮': ['pudim', 'pudim', 'doce', 'dessert'],
  '🍭': ['pirulito', 'lollipop', 'doce'],
  '🍬': ['bala', 'candy', 'doce'],
  '🍫': ['chocolate', 'chocolate', 'doce', 'barra'],
  '🍿': ['pipoca', 'popcorn', 'filme', 'cinema'],
  '🍩': ['donut', 'donut', 'doce', 'rosquinha'],
  '🍪': ['biscoito', 'cookie', 'doce'],
  '🌰': ['castanha', 'chestnut', 'noz'],
  '🥜': ['amendoim', 'peanut', 'noz'],
  '🍯': ['mel', 'honey', 'abelha', 'doce'],
  '🥛': ['leite', 'milk', 'bebida'],
  '🍼': ['mamadeira', 'baby bottle', 'bebe'],
  '☕': ['café', 'coffee', 'bebida', 'cafe'],
  '🍵': ['cha', 'tea', 'bebida', 'japones'],
  '🧃': ['suco', 'juice', 'bebida'],
  '🥤': ['copo', 'cup', 'bebida', 'suco'],
  '🧋': ['bubble tea', 'milk tea', 'taiwan'],
  '🍶': ['saque', 'sake', 'bebida', 'japones'],
  '🍺': ['cerveja', 'beer', 'bebida', 'alcool'],
  '🍻': ['cervejas', 'beers', 'bebida', 'alcool'],
  '🥂': ['brinde', 'cheers', 'bebida', 'alcool'],
  '🍷': ['vinho', 'wine', 'bebida', 'alcool'],
  '🥃': ['whisky', 'whiskey', 'bebida', 'alcool'],
  '🍸': ['coquetel', 'cocktail', 'bebida', 'alcool'],
  '🍹': ['drink', 'tropical', 'bebida', 'alcool'],
  '🍾': ['champagne', 'champagne', 'festas'],
  '⚽': ['futebol', 'football', 'soccer', 'esporte'],
  '🏀': ['basquete', 'basketball', 'esporte'],
  '🏈': ['futebol americano', 'football', 'esporte'],
  '⚾': ['beisebol', 'baseball', 'esporte'],
  '🎾': ['tênis', 'tennis', 'esporte'],
  '🏐': ['voleibol', 'volleyball', 'esporte'],
  '🏉': ['rugby', 'rugby', 'esporte'],
  '🎱': ['sinuca', 'billiards', 'esporte'],
  '🏓': ['ping pong', 'table tennis', 'esporte'],
  '🏸': ['badminton', 'badminton', 'esporte'],
  '🏒': ['hockey', 'hockey', 'esporte'],
  '🏑': ['hockey', 'field hockey', 'esporte'],
  '🥍': ['lacrosse', 'lacrosse', 'esporte'],
  '🏏': ['cricket', 'cricket', 'esporte'],
  '🥅': ['gol', 'goal', 'esporte'],
  '⛳': ['golfe', 'golf', 'esporte'],
  '🏹': ['arco', 'archery', 'esporte'],
  '🎣': ['pesca', 'fishing', 'esporte'],
  '🥊': ['luva', 'boxing gloves', 'esporte'],
  '🥋': ['karate', 'karate', 'esporte'],
  '🎽': ['camisa', 'running shirt', 'esporte'],
  '🛹': ['skate', 'skate', 'esporte'],
  '🛼': ['patins', 'roller skate', 'esporte'],
  '🛷': ['treno', 'sled', 'inverno'],
  '⛸️': ['patinação', 'ice skating', 'inverno'],
  '🥌': ['bola de bocha', 'boccia', 'inverno'],
  '🎿': ['esqui', 'skiing', 'inverno'],
  '⛷️': ['esqui', 'skiing', 'inverno'],
  '🏂': ['snowboard', 'snowboard', 'inverno'],
  '🏋️': ['academia', 'gym', 'musculacao', 'esporte'],
  '🤼': ['luta', 'wrestling', 'esporte'],
  '🤸': ['ginastica', 'gymnastics', 'esporte'],
  '⛹️': ['basquete', 'basketball', 'esporte'],
  '🤾': ['handebol', 'handball', 'esporte'],
  '🏌️': ['golfe', 'golf', 'esporte'],
  '🏇': ['corrida de cavalo', 'horse racing', 'esporte'],
  '🧘': ['yoga', 'yoga', 'meditação', 'esporte'],
  '🏄': ['surf', 'surf', 'esporte', 'praia'],
  '🏊': ['natação', 'swimming', 'esporte'],
  '🤽': ['polo aquatico', 'water polo', 'esporte'],
  '🚣': ['barco', 'rowing', 'esporte'],
  '🧗': ['escalada', 'climbing', 'esporte'],
  '🚵': ['bike', 'mountain biking', 'esporte'],
  '🚴': ['bike', 'cycling', 'esporte'],
  '🏆': ['trofeu', 'trophy', 'premio', 'vencedor'],
  '🥇': ['ouro', 'gold medal', 'primeiro', 'ouro'],
  '🥈': ['prata', 'silver medal', 'segundo', 'prata'],
  '🥉': ['bronze', 'bronze medal', 'terceiro', 'bronze'],
  '🎮': ['video game', 'game', 'jogo', 'playstation', 'xbox'],
  '🎰': ['cassino', 'slot machine', 'jogo', 'aposta'],
  '🎲': ['dado', 'dice', 'jogo', 'azar'],
  '♟️': ['xadrez', 'chess', 'jogo', 'tabuleiro'],
  '🎯': ['dardos', 'darts', 'jogo', 'alvo'],
  '🎳': ['boliche', 'bowling', 'jogo'],
  '🧩': ['quebra cabeca', 'puzzle', 'jogo'],
  '🎸': ['guitarra', 'guitar', 'musica', 'instrumento'],
  '🎷': ['saxofone', 'saxophone', 'musica', 'instrumento'],
  '🎺': ['trompete', 'trumpet', 'musica', 'instrumento'],
  '🎻': ['violino', 'violin', 'musica', 'instrumento'],
  '🎹': ['piano', 'piano', 'musica', 'instrumento'],
  '🥁': ['bateria', 'drum', 'musica', 'instrumento'],
  '🎤': ['microfone', 'microphone', 'musica', 'karaoke'],
  '🎧': ['fone', 'headphones', 'musica', 'fone'],
  '🎼': ['musica', 'music', 'partitura'],
  '🎬': ['filme', 'movie', 'cinema', 'filmes'],
  '🎨': ['arte', 'art', 'pintura', 'artista'],
  '🎭': ['teatro', 'theater', 'mascara'],
  '🎪': ['circo', 'circus', 'tenda'],
  '🎂': ['aniversario', 'birthday', 'bolo', 'parabens'],
  '🎁': ['presente', 'gift', 'natal', 'aniversario'],
  '🎈': ['balão', 'balloon', 'festas', 'aniversario'],
  '🎊': ['confete', 'confetti', 'festa'],
  '🎉': ['festa', 'party', 'parabens', 'celebracao'],
  '🎎': ['japao', 'japan', 'festival'],
  '🏮': ['lanterna', 'lantern', 'japao', 'festas'],
  '🎐': ['sino', 'wind chime', 'japao'],
  '🧧': ['envelope vermelho', 'red envelope', 'dinheiro', 'sorte'],
  '🚗': ['carro', 'car', 'veiculo', 'automóvel'],
  '🚕': ['táxi', 'taxi', 'carro', 'veiculo'],
  '🚙': ['suv', 'suv', 'carro', 'veiculo'],
  '🚌': ['onibus', 'bus', 'veiculo', 'transporte'],
  '🚎': ['onibus', 'bus', 'veiculo'],
  '🏎️': ['carro', 'race car', 'corrida'],
  '🚓': ['polícia', 'police car', 'veiculo', 'polícia'],
  '🚑': ['ambulância', 'ambulance', 'veiculo', 'hospital'],
  '🚒': ['bombeiros', 'fire truck', 'veiculo', 'fogo'],
  '🚐': ['van', 'van', 'veiculo'],
  '🏍️': ['moto', 'motorcycle', 'veiculo'],
  '🛵': ['moto', 'scooter', 'veiculo'],
  '🚲': ['bike', 'bicycle', 'veiculo', 'ciclista'],
  '🛴': ['patinete', 'scooter', 'veiculo'],
  '🚨': ['sirene', 'siren', 'emergencia', 'alarme'],
  '🚔': ['polícia', 'police', 'veiculo'],
  '✈️': ['avião', 'airplane', 'viagem', 'voo'],
  '🛫': ['decolagem', 'takeoff', 'aviao', 'viagem'],
  '🛬': ['pouso', 'landing', 'aviao', 'viagem'],
  '🛩️': ['jato', 'jet', 'aviao'],
  '💺': ['assento', 'seat', 'aviao'],
  '🚀': ['foguete', 'rocket', 'espaco', 'nasa'],
  '🛸': ['ovni', 'ufo', 'alien', 'espaco'],
  '🚁': ['helicoptero', 'helicopter', 'veiculo'],
  '🛶': ['canoa', 'canoe', 'barco'],
  '⛵': ['vela', 'sailboat', 'barco', 'mar'],
  '🚤': ['lancha', 'speedboat', 'barco', 'mar'],
  '🛥': ['iate', 'yacht', 'barco', 'mar'],
  '🛳️': ['cruzeiro', 'cruise', 'barco', 'mar'],
  '🚢': ['navio', 'ship', 'barco', 'mar'],
  '⚓': ['ancora', 'anchor', 'mar', 'navio'],
  '⛽': ['combustivel', 'gas station', 'gasolina'],
  '🚧': ['obras', 'construction', 'obra', 'trabalho'],
  '🚦': ['semáforo', 'traffic light', 'sinal', 'transito'],
  '🚥': ['sinal', 'traffic light', 'transito'],
  '🗺️': ['mapa', 'map', 'mundo', 'viagem'],
  '🗿': ['moai', 'moai', 'pascoa', 'estatua'],
  '🗽': ['estátua', 'statue of liberty', 'liberty', 'ny'],
  '🗼': ['torre', 'tower', 'paris', 'eiffel'],
  '🏰': ['castelo', 'castle', 'princesa', 'fantasia'],
  '🏯': ['castelo', 'castle', 'japao'],
  '🏟️': ['estadio', 'stadium', 'futebol', 'esporte'],
  '🎡': ['roda gigante', 'ferris wheel', 'parque', 'festas'],
  '🎢': ['montanha russa', 'roller coaster', 'parque', 'festa'],
  '🎠': ['cavalo', 'carousel', 'parque', 'cavalo'],
  '⛲': ['fonte', 'fountain', 'parque', 'agua'],
  '🏖️': ['praia', 'beach', 'mar', 'sol'],
  '🏝️': ['ilha', 'island', 'deserto', 'mar'],
  '🌋': ['vulcão', 'volcano', 'lava', 'fogo'],
  '⛰️': ['montanha', 'mountain', 'natureza'],
  '🗻': ['montanha', 'mount fuji', 'japao'],
  '🏕️': ['acampamento', 'camping', 'natureza'],
  '⛺': ['barraca', 'tent', 'acampamento'],
  '🏠': ['casa', 'home', 'moradia'],
  '🏡': ['casa com jardim', 'home with garden', 'moradia'],
  '🏢': ['predio', 'building', 'escritorio'],
  '🏭': ['fabrica', 'factory', 'industria'],
  '🏬': ['loja', 'mall', 'shopping'],
  '🏥': ['hospital', 'hospital', 'saude'],
  '🏦': ['banco', 'bank', 'dinheiro'],
  '🏨': ['hotel', 'hotel', 'hospidade'],
  '🏪': ['loja', 'convenience store', 'loja'],
  '🏫': ['escola', 'school', 'estudo'],
  '⛪': ['igreja', 'church', 'religiao'],
  '🕌': ['mesquita', 'mosque', 'religiao'],
  '🕍': ['sinagoga', 'synagogue', 'religiao'],
  '⛩️': ['santuario', 'shrine', 'japao', 'religiao'],
  '🗿': ['moai', 'moai', 'estatua'],
  '💰': ['dinheiro', 'money', 'rico', 'fortuna'],
  '💵': ['dinheiro', 'dollar', 'nota'],
  '💴': ['iene', 'yen', 'dinheiro', 'japao'],
  '💶': ['euro', 'euro', 'dinheiro'],
  '💷': ['libra', 'pound', 'dinheiro'],
  '💎': ['diamante', 'diamond', 'joia', 'caro'],
  '💍': ['anel', 'ring', 'casamento', 'noivado'],
  '💄': ['batom', 'lipstick', 'beleza', 'maquiagem'],
  '👠': ['salto', 'high heel', 'sapato', 'beleza'],
  '👢': ['bota', 'boot', 'sapato'],
  '👑': ['coroa', 'crown', 'reis', 'ouro'],
  '🎩': ['chapéu', 'top hat', 'carter', 'formal'],
  '🎓': ['formatura', 'graduation', 'universidade', 'estudo'],
  '👒': ['chapéu', 'hat', 'sol', 'beleza'],
  '👜': ['bolsa', 'handbag', 'mochila', 'bolsa'],
  '🎒': ['mochila', 'backpack', 'escola', 'viagem'],
  '👝': ['bolsa', 'pouch', 'mochila'],
  '🎁': ['presente', 'gift', 'natal', 'aniversario'],
  '🔍': ['lupa', 'search', 'buscar', 'procurar'],
  '🔎': ['lupa', 'search', 'buscar'],
  '🔬': ['microscopio', 'microscope', 'ciencia', 'estudo'],
  '🔭': ['telescopio', 'telescope', 'espaco', 'astronomia'],
  '💡': ['ideia', 'idea', 'lampada', 'lâmpada'],
  '🔦': ['lanterna', 'flashlight', 'luz', 'lanterna'],
  '🕯️': ['vela', 'candle', 'luz', 'velas'],
  '🧯': ['extintor', 'fire extinguisher', 'fogo'],
  '🛢️': ['bidão', 'oil drum', 'combustivel'],
  '💸': ['dinheiro', 'money wings', 'dinheiro', 'rico'],
  '💳': ['cartao', 'credit card', 'dinheiro', 'pagamento'],
  '📱': ['celular', 'smartphone', 'telefone', 'iphone'],
  '📲': ['celular', 'phone', 'telefone', 'whatsapp'],
  '💻': ['notebook', 'laptop', 'computador', 'trabalho'],
  '⌨️': ['teclado', 'keyboard', 'computador', 'trabalho'],
  '🖥️': ['computador', 'desktop', 'computador', 'trabalho'],
  '🖨️': ['impressora', 'printer', 'trabalho'],
  '🖱️': ['mouse', 'mouse', 'computador'],
  '🖲️': ['mouse', 'trackball', 'computador'],
  '💽': ['hd', 'hard disk', 'computador'],
  '💾': ['disquete', 'floppy disk', 'computador'],
  '💿': ['cd', 'cd', 'musica', 'computador'],
  '📀': ['dvd', 'dvd', 'musica', 'filme'],
  '📷': ['camera', 'camera', 'foto', 'photography'],
  '📸': ['camera', 'camera flash', 'foto'],
  '📹': ['filmadora', 'video camera', 'video'],
  '🎥': ['camera', 'movie camera', 'video', 'filme'],
  '📞': ['telefone', 'telephone', 'ligacao'],
  '☎️': ['telefone', 'phone', 'ligacao'],
  '📟': ['pager', 'pager', 'mensagem'],
  '📠': ['fax', 'fax', 'trabalho'],
  '📺': ['tv', 'television', 'tv', 'televisao'],
  '📻': ['radio', 'radio', 'musica', 'noticia'],
  '🎙️': ['microfone', 'microphone', 'radio', 'podcast'],
  '🎚️': ['mixer', 'mixer', 'musica'],
  '🎛️': ['mixer', 'dj', 'musica'],
  '⏱️': ['cronometro', 'stopwatch', 'tempo'],
  '⏲️': ['timer', 'timer', 'tempo', 'cozinha'],
  '⏰': ['despertador', 'alarm clock', 'tempo', 'acordar'],
  '🕰️': ['relogio', 'clock', 'tempo'],
  '⌛': ['ampulheta', 'hourglass', 'tempo', 'areia'],
  '⏳': ['ampulheta', 'hourglass', 'tempo', 'areia'],
  '📡': ['satelite', 'satellite', 'sinal', 'tv'],
  '🔋': ['bateria', 'battery', 'energia', 'celular'],
  '🔌': ['tomada', 'plug', 'energia', 'carregador'],
  '📺': ['tv', 'television', 'tv'],
  '📻': ['radio', 'radio'],
  '🧭': ['bussola', 'compass', 'direção', 'norte'],
  '🗺️': ['mapa', 'map', 'mundo'],
  '🗿': ['moai', 'moai'],
  '🔑': ['chave', 'key', 'porta', 'abrir'],
  '🗝️': ['chave', 'key', 'antiga'],
  '🚪': ['porta', 'door', 'entrada'],
  '🪑': ['cadeira', 'chair', 'mobília'],
  '🛋️': ['sofa', 'sofa', 'sala'],
  '🛏️': ['cama', 'bed', 'dormir', 'quarto'],
  '🛌': ['cama', 'sleeping', 'dormir'],
  '🧸': ['ursinho', 'teddy bear', 'brinquedo', 'presente'],
  '🖼️': ['quadro', 'picture frame', 'arte', 'foto'],
  '🪞': ['espelho', 'mirror', 'beleza'],
  '🪟': ['janela', 'window', 'vidro'],
  '🛍️': ['sacolas', 'shopping bags', 'compras'],
  '🛒': ['carrinho', 'shopping cart', 'compras'],
  '🎁': ['presente', 'gift', 'natal', 'aniversario'],
  '🎈': ['balão', 'balloon', 'festa', 'aniversario'],
  '🎀': ['laço', 'ribbon', 'festa', 'presente'],
  '🎊': ['confete', 'confetti', 'festa'],
  '🎉': ['festa', 'party', 'celebracao'],
  '✉️': ['carta', 'envelope', 'email', 'mensagem'],
  '📩': ['email', 'email', 'mensagem'],
  '📧': ['email', 'email', 'mensagem'],
  '💌': ['carta de amor', 'love letter', 'amor', 'mensagem'],
  '📦': ['pacote', 'package', 'correio', 'encomenda'],
  '📫': ['caixa', 'mailbox', 'correio'],
  '📬': ['caixa', 'open mailbox', 'correio'],
  '📭': ['caixa', 'mailbox', 'correio'],
  '📮': ['correio', 'postbox', 'correio'],
  '📜': ['rolo', 'scroll', 'documento'],
  '📄': ['papel', 'page', 'documento', 'arquivo'],
  '📑': ['marcador', 'bookmark', 'documento'],
  '📊': ['grafico', 'chart', 'estatistica', 'dados'],
  '📈': ['grafico', 'chart up', 'crescimento', 'subindo'],
  '📉': ['grafico', 'chart down', 'queda', 'descendo'],
  '📆': ['calendario', 'calendar', 'data', 'dia'],
  '📅': ['calendario', 'calendar', 'data', 'dia'],
  '📇': ['arquivo', 'card index', 'dados'],
  '🗂️': ['pastas', 'card index', 'arquivos'],
  '🗃️': ['caixa', 'file box', 'arquivos'],
  '🗳️': ['urna', 'ballot box', 'votar'],
  '🗄️': ['arquivo', 'file cabinet', 'arquivos'],
  '📋': ['prancheta', 'clipboard', 'documento'],
  '📁': ['pasta', 'folder', 'arquivos'],
  '📂': ['pasta aberta', 'open folder', 'arquivos'],
  '🗞️': ['jornal', 'newspaper', 'noticia', 'jornal'],
  '📰': ['jornal', 'newspaper', 'noticia'],
  '📓': ['caderno', 'notebook', 'estudo'],
  '📔': ['caderno', 'notebook', 'estudo'],
  '📒': ['caderno', 'notebook', 'estudo'],
  '📕': ['livro', 'book', 'fechado', 'leitura'],
  '📗': ['livro verde', 'green book', 'leitura'],
  '📘': ['livro azul', 'blue book', 'leitura'],
  '📙': ['livro laranja', 'orange book', 'leitura'],
  '📚': ['livros', 'books', 'biblioteca', 'estudo'],
  '📖': ['livro', 'book', 'leitura', 'livro'],
  '🔖': ['marcador', 'bookmark', 'leitura'],
  '📎': ['clipe', 'paperclip', 'escritorio'],
  '🖇️': ['clipe', 'paperclip', 'escritorio'],
  '📐': ['régua', 'ruler', 'geometria', 'estudo'],
  '📏': ['régua', 'ruler', 'geometria'],
  '✂️': ['tesoura', 'scissors', 'cortar', 'escritorio'],
  '🖊️': ['caneta', 'pen', 'escrever'],
  '🖋️': ['caneta', 'fountain pen', 'escrever'],
  '✒️': ['caneta', 'black nib', 'escrever'],
  '🖌️': ['pincel', 'paintbrush', 'arte'],
  '🖍️': ['giz de cera', 'crayon', 'arte'],
  '📝': ['nota', 'memo', 'anotar', 'nota'],
  '✏️': ['lapis', 'pencil', 'escrever', 'estudo'],
  '🔍': ['lupa', 'search', 'buscar', 'procurar'],
  '🔎': ['lupa', 'search', 'buscar'],
  '🔏': ['cadeado', 'lock', 'privado'],
  '🔐': ['cadeado', 'lock', 'seguro', 'chave'],
  '🔒': ['cadeado', 'lock', 'seguro', 'trancado'],
  '🔓': ['cadeado', 'unlock', 'aberto', 'desbloqueado'],
  '❤️': ['coração', 'heart', 'amor', 'love', 'carinho', 'coracao', 'corazon'],
  '🧡': ['coração', 'orange heart', 'amor', 'love'],
  '💛': ['coração', 'yellow heart', 'amor', 'love'],
  '💚': ['coração', 'green heart', 'amor', 'love'],
  '💙': ['coração', 'blue heart', 'amor', 'love'],
  '💜': ['coração', 'purple heart', 'amor', 'love'],
  '🖤': ['coração', 'black heart', 'amor', 'negro'],
  '🤍': ['coração', 'white heart', 'amor', 'branco'],
  '🤎': ['coração', 'brown heart', 'amor', 'marrom'],
  '💔': ['coração', 'broken heart', 'coracao partido', 'triste', 'dor'],
  '❣️': ['coração', 'heart exclamation', 'amor', 'love'],
  '💕': ['dois corações', 'two hearts', 'amor', 'love'],
  '💞': ['corações', 'revolving hearts', 'amor', 'love'],
  '💓': ['coração', 'beating heart', 'amor', 'love'],
  '💗': ['coração', 'growing heart', 'amor', 'love'],
  '💖': ['coração', 'sparkling heart', 'amor', 'love'],
  '💘': ['coração', 'heart with arrow', 'amor', 'cupido'],
  '💝': ['coração', 'heart with ribbon', 'amor', 'presente'],
  '💟': ['coração', 'heart decoration', 'amor', 'love'],
  '☮️': ['paz', 'peace', 'paz'],
  '✝️': ['cruz', 'cross', 'cristão', 'religiao'],
  '☪️': ['estrela', 'star and crescent', 'islã', 'musulmano'],
  '☸️': ['roda', 'wheel of dharma', 'budismo'],
  '✡️': ['estrela', 'star of david', 'judeu', 'judaísmo'],
  '🔯': ['estrela', 'star of david', 'judeu'],
  '☯️': ['yin yang', 'yin yang', 'equilíbrio'],
  '☦️': ['cruz', 'cross', 'ortodoxo'],
  '🛐': ['oraçao', 'place of worship', 'oraçao'],
  '♈': ['aries', 'aries', 'zodiaco', 'signo'],
  '♉': ['touro', 'taurus', 'zodiaco', 'signo'],
  '♊': ['gemeos', 'gemini', 'zodiaco', 'signo'],
  '♋': ['cancer', 'cancer', 'zodiaco', 'signo'],
  '♌': ['leao', 'leo', 'zodiaco', 'signo'],
  '♍': ['virgem', 'virgo', 'zodiaco', 'signo'],
  '♎': ['libra', 'libra', 'zodiaco', 'signo'],
  '♏': ['escorpiao', 'scorpio', 'zodiaco', 'signo'],
  '♐': ['sagitario', 'sagittarius', 'zodiaco', 'signo'],
  '♑': ['capricornio', 'capricorn', 'zodiaco', 'signo'],
  '♒': ['aquario', 'aquarius', 'zodiaco', 'signo'],
  '♓': ['peixes', 'pisces', 'zodiaco', 'signo'],
  '🆔': ['identidade', 'identity', 'id'],
  '⚛️': ['átomo', 'atom', 'ciência', 'física'],
  '🉑': ['japones', 'japanese button', 'aceitável'],
  '☢️': ['radioativo', 'radioactive', 'perigoso'],
  '☣️': ['biohazard', 'biohazard', 'perigoso'],
  '📴': ['vibrar', 'vibration mode', 'silencioso'],
  '📳': ['vibrar', 'vibration mode', 'celular'],
  '🈶': ['japones', 'japanese button', 'tem'],
  '🈚': ['japones', 'japanese button', 'não tem'],
  '🈸': ['japones', 'japanese button', 'aplicação'],
  '🈺': ['japones', 'japanese button', 'aberto'],
  '🈷️': ['japones', 'japanese button', 'mensal'],
  '✴️': ['estrela', 'eight-pointed star', 'estrela'],
  '🆚': ['vs', 'versus', 'contra'],
  '💮': ['flor', 'white flower', 'flor', 'china'],
  '🉐': ['japones', 'japanese button', 'ideia'],
  '㊙️': ['secreto', 'secret', 'confidencial'],
  '㊗️': ['parabens', 'congratulations', 'parabens'],
  '🈴': ['japones', 'japanese button', 'passou'],
  '🈵': ['japones', 'japanese button', 'cheio'],
  '🈹': ['japones', 'japanese button', 'desconto'],
  '🈲': ['japones', 'japanese button', 'proibido'],
  '🅰️': ['a', 'a blood type', 'sangue'],
  '🅱️': ['b', 'b blood type', 'sangue'],
  '🆎': ['ab', 'ab blood type', 'sangue'],
  '🅾️': ['o', 'o blood type', 'sangue'],
  '🆘': ['socorro', 'sos', 'help', 'emergencia'],
  '❌': ['x', 'cross mark', 'erro', 'não', 'nao', 'wrong'],
  '⭕': ['circulo', 'circle', 'ok', 'sim', 's'],
  '🛑': ['pare', 'stop sign', 'pare', 'pare'],
  '⛔': ['proibido', 'no entry', 'proibido', 'nao'],
  '📛': ['nome', 'name badge', 'nome'],
  '🚫': ['proibido', 'prohibited', 'nao', 'nao pode'],
  '💯': ['cem', 'hundred', 'perfeito', 'top', 'zero erros'],
  '💢': ['raiva', 'anger', 'nervoso', 'bravo'],
  '♨️': ['quente', 'hot springs', 'quente', 'onsen'],
  '🚷': ['proibido', 'no pedestrians', 'proibido'],
  '🚯': ['proibido', 'no littering', 'proibido', 'lixo'],
  '🚳': ['proibido', 'no bicycles', 'proibido', 'bike'],
  '🚱': ['proibido', 'non-potable water', 'proibido', 'agua'],
  '🔞': ['proibido', 'no one under eighteen', 'adulto', '18'],
  '📵': ['proibido', 'no mobile phones', 'celular', 'silencio'],
  '🚭': ['proibido', 'no smoking', 'proibido', 'fumar'],
  '❗': ['exclamação', 'exclamation', 'alerta', 'importante'],
  '❕': ['exclamação', 'white exclamation', 'alerta'],
  '❓': ['pergunta', 'question', 'duvida', 'oq', 'o que'],
  '❔': ['pergunta', 'white question', 'duvida'],
  '‼️': ['dupla exclamação', 'double exclamation', 'alerta'],
  '⁉️': ['exclamação e pergunta', 'exclamation question', 'alerta'],
  '🔅': ['brilho', 'dim button', 'baixo brilho'],
  '🔆': ['brilho', 'bright button', 'alto brilho'],
  '⚠️': ['aviso', 'warning', 'alerta', 'cuidado', 'atenção'],
  '🚸': ['crianças', 'children crossing', 'atenção'],
  '🔱': ['tridente', 'trident emblem', 'mar', 'poseidon'],
  '⚜️': ['flor', 'fleur-de-lis', 'frança'],
  '🔰': ['novato', 'beginner', 'iniciante', 'aprendiz'],
  '♻️': ['reciclar', 'recycling', 'sustentável', 'reciclagem'],
  '✅': ['verificado', 'check mark', 'ok', 'sim', 'certo', 'conferido'],
  '🈯': ['japones', 'japanese button', 'indicado'],
  '💹': ['grafico', 'chart', 'dinheiro', 'bolsa'],
  '❇️': ['brilho', 'sparkle', 'brilho'],
  '✳️': ['asterisco', 'eight-spoked asterisk', 'estrela'],
  '❎': ['x', 'cross mark button', 'erro', 'não', 'cancelar'],
  '🌐': ['globo', 'globe', 'mundo', 'internet', 'web'],
  '💠': ['globo', 'diamond with a dot', 'globo'],
  'Ⓜ️': ['m', 'circled m', 'metro'],
  '🌀': ['redemoinho', 'cyclone', 'furacão', 'tornado'],
  '💤': ['zzz', 'zzz', 'sono', 'dormir', 'soneca'],
  '🏧': ['caixa', 'atm sign', 'banco', 'dinheiro'],
  '🚾': ['banheiro', 'water closet', 'wc', 'banheiro', 'toalete'],
  '♿': ['deficiente', 'wheelchair symbol', 'accessibilidade', 'deficiente'],
  '🅿️': ['estacionamento', 'parking', 'p'],
  '🛗': ['elevador', 'elevator', 'ascensor'],
  '🈳': ['japones', 'japanese button', 'vago'],
  '🈂️': ['japones', 'japanese button', 'serviço'],
  '🛂': ['passaporte', 'passport control', 'imigração'],
  '🛃': ['alfandega', 'customs', 'alfândega'],
  '🛄': ['bagagem', 'baggage claim', 'malas'],
  '🛅': ['bagagem', 'left luggage', 'malas'],
  '🚹': ['banheiro masculino', 'men', 'homens'],
  '🚺': ['banheiro feminino', 'women', 'mulheres'],
  '🚼': ['bebe', 'baby symbol', 'bebe', 'berçário'],
  '⚧️': ['transgenero', 'transgender', 'lgbt'],
  '🚻': ['banheiro', 'restroom', 'wc'],
  '🚮': ['lixo', 'litter in bin', 'lixo', 'colocar'],
  '🎦': ['cinema', 'movie camera', 'filme'],
  '📶': ['sinal', 'antenna bars', 'wifi', 'sinal'],
  '🈁': ['japones', 'japanese button', 'aqui'],
  '🔣': ['simbolos', 'input symbols', 'simbolos'],
  'ℹ️': ['info', 'information', 'info', 'informação'],
  '🔤': ['abc', 'input latin letters', 'letras'],
  '🔡': ['abc', 'input latin lowercase', 'letras'],
  '🔠': ['ABC', 'input latin uppercase', 'letras'],
  '🆖': ['ng', 'squared ng', 'nao'],
  '🆗': ['squared ok', 'squared ng', 'nao'],
  '🆙': ['up', 'squared up', 'cima', 'levantar'],
  '🆕': ['new', 'squared new', 'novo'],
  '🆓': ['free', 'squared free', 'livre', 'gratis'],
  '0️⃣': ['zero', 'keycap digit zero', '0'],
  '1️⃣': ['um', 'keycap digit one', '1'],
  '2️⃣': ['dois', 'keycap digit two', '2'],
  '3️⃣': ['tres', 'keycap digit three', '3'],
  '4️⃣': ['quatro', 'keycap digit four', '4'],
  '5️⃣': ['cinco', 'keycap digit five', '5'],
  '6️⃣': ['seis', 'keycap digit six', '6'],
  '7️⃣': ['sete', 'keycap digit seven', '7'],
  '8️⃣': ['oito', 'keycap digit eight', '8'],
  '9️⃣': ['nove', 'keycap digit nine', '9'],
  '🔟': ['dez', 'keycap digit ten', '10'],
  '🔢': ['numeros', 'input numbers', 'numeros'],
  '#️⃣': ['hashtag', 'keycap number sign', 'hashtag', 'trending'],
  '*️⃣': ['asterisco', 'keycap asterisk', 'asterisco'],
  '▶️': ['play', 'play button', 'tocar', 'assistir'],
  '⏸️': ['pause', 'pause button', 'pausar'],
  '⏹️': ['stop', 'stop button', 'parar'],
  '⏺️': ['record', 'record button', 'gravar'],
  '⏭️': ['next', 'next track', 'proximo'],
  '⏮️': ['prev', 'last track', 'anterior'],
  '⏩': ['forward', 'fast-forward', 'frente'],
  '⏪': ['rewind', 'fast reverse', 'tras'],
  '⏫': ['up', 'fast up', 'subir'],
  '⏬': ['down', 'fast down', 'descer'],
  '◀️': ['esquerda', 'left arrow', 'voltar'],
  '🔼': ['cima', 'up arrow', 'subir'],
  '🔽': ['baixo', 'down arrow', 'descer'],
  '➡️': ['direita', 'right arrow', 'ir', 'frente'],
  '⬅️': ['esquerda', 'left arrow', 'voltar'],
  '⬆️': ['cima', 'up arrow', 'subir', 'cima'],
  '⬇️': ['baixo', 'down arrow', 'descer', 'baixo'],
  '↗️': ['nordeste', 'up-right arrow', 'diagonal'],
  '↘️': ['sudeste', 'down-right arrow', 'diagonal'],
  '↙️': ['sudoeste', 'down-left arrow', 'diagonal'],
  '↖️': ['noroeste', 'up-left arrow', 'diagonal'],
  '↕️': ['cima baixo', 'up-down arrow', 'vertical'],
  '↔️': ['esquerda direita', 'left-right arrow', 'horizontal'],
  '↪️': ['retorno', 'left arrow curving right', 'voltar'],
  '↩️': ['retorno', 'right arrow curving left', 'voltar'],
  '⤴️': ['curva cima', 'right arrow curving up', 'subir'],
  '⤵️': ['curva baixo', 'right arrow curving down', 'descer'],
  '🔀': ['aleatorio', 'shuffle tracks', 'aleatorio', 'embaralhar'],
  '🔁': ['repetir', 'repeat', 'loop', 'repetir'],
  '🔂': ['repetir um', 'repeat single', 'loop'],
  '🔄': ['atualizar', 'clockwise arrows', 'atualizar', 'refresh'],
  '🔃': ['sincronizar', 'clockwise vertical arrows', 'sincronizar'],
  '🎵': ['nota musical', 'musical note', 'musica'],
  '🎶': ['notas musicais', 'musical notes', 'musica'],
  '➕': ['mais', 'plus', 'adicionar', 'somar', 'mais'],
  '➖': ['menos', 'minus', 'subtrair', 'tirar', 'menos'],
  '➗': ['dividir', 'divide', 'divisão'],
  '✖️': ['multiplicar', 'multiply', 'vezes', 'multiplicar'],
  '♾️': ['infinito', 'infinity', 'infinito'],
  '💲': ['dinheiro', 'heavy dollar sign', 'dinheiro', 'dollar'],
  '💱': ['moeda', 'currency exchange', 'moeda', 'câmbio'],
  '™️': ['tm', 'trade mark', 'marca'],
  '©️': ['copyright', 'copyright', 'direitos'],
  '®️': ['registrado', 'registered', 'marca'],
  '〰️': ['ondulado', 'wavy dash', 'linha'],
  '➰': ['laço', 'curly loop', 'laço'],
  '➿': ['laço duplo', 'double curly loop', 'laço'],
  '✔️': ['check', 'check mark', 'ok', 'sim', 'conferido'],
  '☑️': ['checkbox', 'check box with check', 'ok', 'selecionar'],
  '🔘': ['radio', 'radio button', 'selecionar'],
  '🔴': ['vermelho', 'red circle', 'cor', 'vermelho'],
  '🟠': ['laranja', 'orange circle', 'cor', 'laranja'],
  '🟡': ['amarelo', 'yellow circle', 'cor', 'amarelo'],
  '🟢': ['verde', 'green circle', 'cor', 'verde'],
  '🔵': ['azul', 'blue circle', 'cor', 'azul'],
  '🟣': ['roxo', 'purple circle', 'cor', 'roxo'],
  '⚫': ['preto', 'black circle', 'cor', 'preto'],
  '⚪': ['branco', 'white circle', 'cor', 'branco'],
  '🟤': ['marrom', 'brown circle', 'cor', 'marrom'],
  '🔺': ['triangulo', 'red triangle', 'cor', 'vermelho'],
  '🔻': ['triangulo baixo', 'red triangle down', 'cor', 'vermelho'],
  '🔸': ['diamante', 'orange diamond', 'cor', 'laranja'],
  '🔹': ['diamante azul', 'blue diamond', 'cor', 'azul'],
  '🔶': ['diamante grande', 'large orange diamond', 'cor'],
  '🔷': ['diamante grande azul', 'large blue diamond', 'cor'],
  '🔳': ['quadrado', 'square button', 'cor'],
  '🔲': ['quadrado borda', 'square button outline', 'cor'],
  '▪️': ['quadrado preto', 'black small square', 'cor'],
  '▫️': ['quadrado branco', 'white small square', 'cor'],
  '◾': ['preto', 'black medium square', 'cor'],
  '◽': ['branco', 'white medium square', 'cor'],
  '◼️': ['preto', 'black medium square', 'cor'],
  '◻️': ['branco', 'white medium square', 'cor'],
  '🟥': ['vermelho', 'red square', 'cor', 'vermelho'],
  '🟧': ['laranja', 'orange square', 'cor', 'laranja'],
  '🟨': ['amarelo', 'yellow square', 'cor', 'amarelo'],
  '🟩': ['verde', 'green square', 'cor', 'verde'],
  '🟦': ['azul', 'blue square', 'cor', 'azul'],
  '🟪': ['roxo', 'purple square', 'cor', 'roxo'],
  '⬛': ['preto', 'black large square', 'cor'],
  '⬜': ['branco', 'white large square', 'cor'],
  '🟫': ['marrom', 'brown square', 'cor', 'marrom'],
  '🔈': ['som', 'speaker', 'audio', 'som'],
  '🔇': ['mudo', 'speaker with cancellation line', 'mudo', 'silencio'],
  '🔉': ['som baixo', 'speaker low', 'audio'],
  '🔊': ['som alto', 'speaker high', 'audio', 'som'],
  '🔔': ['sino', 'bell', 'notificação', 'alarme'],
  '🔕': ['sino cortado', 'bell with cancellation line', 'silenciado'],
  '📣': ['megafone', 'megaphone', 'anuncio', 'gritar'],
  '📢': ['alto falante', 'public address', 'anuncio'],
  '💬': ['balão', 'speech balloon', 'mensagem', 'chat'],
  '💭': ['pensamento', 'thought balloon', 'pensando', 'ideia'],
  '🗯️': ['grito', 'right anger bubble', 'grito', 'raiva'],
  '♠️': ['espadas', 'spade', 'baralho', 'naipe'],
  '♣️': ['paus', 'club', 'baralho', 'naipe'],
  '♥️': ['copas', 'heart', 'baralho', 'naipe', 'amor'],
  '♦️': ['ouros', 'diamond', 'baralho', 'naipe'],
  '🃏': ['coringa', 'joker', 'baralho', 'joker'],
  '🎴': ['carta', 'flower playing cards', 'baralho'],
  '🕐': ['hora', 'one oclock', 'tempo', 'horas'],
  '🕑': ['hora', 'two oclock', 'tempo', 'horas'],
  '🕒': ['hora', 'three oclock', 'tempo', 'horas'],
  '🕓': ['hora', 'four oclock', 'tempo', 'horas'],
  '🕔': ['hora', 'five oclock', 'tempo', 'horas'],
  '🕕': ['hora', 'six oclock', 'tempo', 'horas'],
  '🕖': ['hora', 'seven oclock', 'tempo', 'horas'],
  '🕗': ['hora', 'eight oclock', 'tempo', 'horas'],
  '🕘': ['hora', 'nine oclock', 'tempo', 'horas'],
  '🕙': ['hora', 'ten oclock', 'tempo', 'horas'],
  '🕚': ['hora', 'eleven oclock', 'tempo', 'horas'],
  '🕛': ['hora', 'twelve oclock', 'tempo', 'horas'],
  '👍': ['joinha', 'thumbs up', 'curtir', 'like', 'legal', 'ok', 'sim'],
  '👎': ['joinha baixo', 'thumbs down', 'nao curtir', 'deslike'],
  '👌': ['ok', 'ok hand', 'ok', 'perfeito', 'legal'],
  '✌️': ['vitoria', 'victory hand', 'vitoria', 'peace', 'v'],
  '🤞': ['esperanca', 'crossed fingers', 'sorte', 'esperança'],
  '🤝': ['aperto de mao', 'handshake', 'acordo', 'paz', 'contrato'],
  '🙏': ['rezar', 'folded hands', 'oraçao', 'por favor', 'obrigado', 'amen', 'ame'],
  '🤙': ['ligacao', 'call me hand', 'ligacao', 'salve', 'e ai'],
  '🤚': ['mao', 'raised back of hand', 'mao'],
  '🖐️': ['mao', 'hand with fingers splayed', 'mao', 'para'],
  '✋': ['mao', 'raised hand', 'mao', 'para'],
  '🖖': ['vulcano', 'vulcan salute', 'star trek', 'viva'],
  '👋': ['ola', 'waving hand', 'ola', 'oi', 'tchau', 'bye', 'sair'],
  '🤏': ['pequeno', 'pinching hand', 'pequeno', 'pouco'],
  '✍️': ['escrevendo', 'writing hand', 'escrevendo', 'digitar'],
  '👅': ['lingua', 'tongue', 'lingua', 'piroca'],
  '👄': ['boca', 'mouth', 'boca', 'labios'],
  '👶': ['bebe', 'baby', 'bebe', 'crianca'],
  '🧒': ['crianca', 'child', 'crianca', 'kid'],
  '👦': ['menino', 'boy', 'menino', 'kid'],
  '👧': ['menina', 'girl', 'menina', 'kid'],
  '🧑': ['pessoa', 'person', 'adulto', 'pessoa'],
  '👱': ['loiro', 'person blond hair', 'loiro'],
  '👨': ['homem', 'man', 'adulto', 'male', 'rapaz'],
  '🧔': ['barba', 'person beard', 'barba', 'barudo'],
  '👩': ['mulher', 'woman', 'adulto', 'female', 'moça'],
  '🧓': ['idoso', 'older person', 'idoso', 'velho'],
  '👴': ['velho', 'old man', 'idoso', 'avo'],
  '👵': ['velha', 'old woman', 'idosa', 'avo'],
  '🙍': ['triste', 'person frowning', 'triste', 'bravo'],
  '🙎': ['raiva', 'person pouting', 'raiva', 'nervoso'],
  '🙅': ['nao', 'person gesturing no', 'nao', 'proibido', 'nao'],
  '🙆': ['ok', 'person gesturing ok', 'ok', 'legal'],
  '💁': ['informacao', 'person tipping hand', 'info', 'atendente'],
  '🙋': ['feliz', 'person raising hand', 'feliz', 'alegre'],
  '🧏': ['surdo', 'deaf person', 'surdo', 'deficiente'],
  '🙇': ['inclinado', 'person bowing', 'desculpa', 'perdao'],
  '🤦': ['facepalm', 'facepalm', 'nervoso', 'nossa'],
  '🤷': ['shrug', 'shrug', 'tanto faz', 'nao sei'],
  '👮': ['policial', 'police officer', 'polícia', 'guarda'],
  '🕵️': ['detetive', 'detective', 'investigador'],
  '💂': ['guarda', 'guard', 'guarda real'],
  '🥷': ['ninja', 'ninja', 'ninja'],
  '👷': ['construção', 'construction worker', 'obra', 'trabalhador'],
  '🤴': ['principe', 'prince', 'rei', 'princesa'],
  '👸': ['princesa', 'princess', 'rainha', 'rei'],
  '👳': ['turbante', 'person wearing turban', 'turbante'],
  '👲': ['chines', 'person with skullcap', 'chines'],
  '🧕': ['lenco', 'woman with headscarf', 'lenço'],
  '🤵': ['smoking', 'person in tuxedo', 'noivo', 'formal'],
  '👰': ['noiva', 'person with veil', 'noiva', 'casamento'],
  '🤰': ['gestante', 'pregnant', 'bebe', 'gravida'],
  '🤱': ['amamentando', 'breast-feeding', 'bebe', 'amamentar'],
  '🧑‍🍼': ['bebe', 'person feeding baby', 'bebe', 'mamadeira'],
  '🧑‍🎄': ['papai noel', 'mx christmas', 'santa', 'natal'],
  '🦸': ['heroi', 'superhero', 'heroi', 'heroina'],
  '🦹': ['vilão', 'supervillain', 'vilao', 'malvado'],
  '🧙': ['bruxo', 'mage', 'bruxo', 'magico'],
  '🧚': ['fada', 'fairy', 'fada', 'magico'],
  '🧛': ['vampiro', 'vampire', 'vampiro', 'morto'],
  '🧜': ['sereio', 'merperson', 'sereia', 'sereio'],
  '🧝': ['elfo', 'elf', 'elfo', 'magico'],
  '🧞': ['genio', 'genie', 'genio', 'lampada'],
  '🧟': ['zumbi', 'zombie', 'zumbi', 'morto'],
  '🧠': ['cerebro', 'brain', 'cabeça', 'inteligente'],
  '👁️': ['olho', 'eye', 'olho', 'ver'],
  '👀': ['olhos', 'eyes', 'olhos', 'ver'],
  '👂': ['orelha', 'ear', 'ouvido', 'ouvir'],
  '👃': ['nariz', 'nose', 'nariz', 'cheirar'],
  '👄': ['boca', 'mouth', 'boca', 'beijar'],
  '👅': ['lingua', 'tongue', 'lingua', 'beijar'],
  '🧣': ['lenco', 'scarf', 'pescoco', 'inverno'],
  '🧤': ['luvas', 'gloves', 'mao', 'inverno'],
  '🧥': ['casaco', 'coat', 'inverno', 'roupa'],
  '🧦': ['meias', 'socks', 'pe', 'inverno'],
  '👓': ['oculos', 'glasses', 'visao', 'olhos'],
  '🕶️': ['oculos de sol', 'sunglasses', 'sol', 'legal'],
  '👔': ['gravata', 'necktie', 'trabalho', 'formal'],
  '👕': ['camiseta', 't-shirt', 'roupa', 'camisa'],
  '👖': ['jeans', 'jeans', 'roupa', 'calca'],
  '🥻': ['sari', 'sari', 'roupa', 'india'],
  '🩱': ['biquini', 'one-piece swimsuit', 'praia', 'roupa'],
  '🩲': ['cueca', 'briefs', 'roupa', 'intimo'],
  '🩳': ['bermuda', 'shorts', 'roupa', 'bermuda'],
  '👗': ['vestido', 'dress', 'roupa', 'feminino'],
  '👘': ['kimono', 'kimono', 'roupa', 'japao'],
  '🩴': ['chinelo', 'flip flops', 'praia', 'chinelo'],
  '👠': ['salto', 'high-heeled shoe', 'sapato', 'feminino'],
  '👡': ['sandalia', 'sandal', 'sapato', 'feminino'],
  '👢': ['bota', 'boot', 'sapato', 'inverno'],
  '👣': ['pegadas', 'footprints', 'pe', 'caminhando'],
  '👜': ['bolsa', 'handbag', 'mochila', 'bolsa'],
  '🛍️': ['sacolas', 'shopping bags', 'compras'],
  '🎒': ['mochila', 'backpack', 'escola', 'mochila'],
  '🩰': ['sapatilha', 'ballet shoes', 'danca', 'sapatilha'],
  '👛': ['carteira', 'purse', 'dinheiro', 'mochila'],
  '🪜': ['escada', 'ladder', 'subir', 'escada'],
  '🧳': ['malas', 'luggage', 'viagem', 'aeroporto'],
  '🌂': ['guarda sol', 'umbrella', 'chuva', 'sol'],
  '🪞': ['espelho', 'mirror', 'beleza'],
  '🪟': ['janela', 'window', 'casa'],
  '🛍️': ['sacolas', 'shopping', 'compras'],
  '🎁': ['presente', 'gift', 'natal', 'aniversario'],
  '🎈': ['balao', 'balloon', 'festa', 'aniversario'],
  '🎀': ['laco', 'ribbon', 'presente', 'laco'],
  '🎊': ['confete', 'confetti', 'festa'],
  '🎉': ['festa', 'party', 'yay', 'eita'],
  '🎎': ['japao', 'japan', 'festival'],
  '🏮': ['lanterna', 'lantern', 'japao', 'festa'],
  '🎐': ['sino', 'wind chime', 'japao'],
  '🧧': ['vermelho', 'red envelope', 'dinheiro', 'sorte'],
  '🇧🇷': ['brasil', 'brazil', 'bandeira', 'brasileiro'],
  '🇺🇸': ['eua', 'usa', 'america', 'bandeira'],
  '🇵🇹': ['portugal', 'portugal', 'bandeira'],
  '🇪🇸': ['espanha', 'spain', 'bandeira'],
  '🇦🇷': ['argentina', 'argentina', 'bandeira'],
  '🇲🇽': ['mexico', 'mexico', 'bandeira'],
  '🇫🇷': ['franca', 'france', 'bandeira'],
  '🇩🇪': ['alemanha', 'germany', 'bandeira'],
  '🇮🇹': ['italia', 'italy', 'bandeira'],
  '🇬🇧': ['inglaterra', 'uk', 'bandeira'],
  '🇨🇳': ['china', 'china', 'bandeira'],
  '🇯🇵': ['japao', 'japan', 'bandeira'],
  '🇰🇷': ['coreia', 'korea', 'bandeira']
};

function toggleEmojiPicker() {
  emojiPicker.classList.toggle('hidden');
}

emojiBtn.addEventListener('click', toggleEmojiPicker);

document.querySelectorAll('.emoji-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.emoji-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderEmojis(tab.dataset.category);
  });
});

renderEmojis('recent');

emojiSearchInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase().trim();
  if (query.length === 0) {
    renderEmojis(currentEmojiCategory);
    return;
  }
  
  const results = [];
  Object.keys(EMOJI_KEYWORDS).forEach(emoji => {
    const keywords = EMOJI_KEYWORDS[emoji];
    const match = keywords.some(keyword => keyword.toLowerCase().includes(query));
    if (match) {
      results.push(emoji);
    }
  });
  
  emojiGrid.innerHTML = '';
  if (results.length === 0) {
    emojiGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: #666;">Nenhum emoji encontrado</div>';
    return;
  }
  
  results.slice(0, 48).forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'emoji-btn';
    btn.textContent = emoji;
    btn.onclick = () => insertEmoji(emoji);
    emojiGrid.appendChild(btn);
  });
});

let allMessages = [];
let lastReadMessageId = null;
let peerConnection = null;
let messageAudio = null;
let userList = [];
let mentionDropdown = null;
let mentionStartPos = -1;

function playMessageSound() {
  try {
    if (!messageAudio) {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const playTone = (freq, startTime, duration) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      
      const now = audioCtx.currentTime;
      playTone(800, now, 0.1);
      playTone(1000, now + 0.08, 0.15);
      playTone(800, now + 0.2, 0.1);
      playTone(600, now + 0.35, 0.2);
    } else {
      messageAudio.volume = 0.3;
      messageAudio.currentTime = 0;
      messageAudio.play().catch(() => {});
    }
  } catch (e) {}
}
let localStream = null;
let isInCall = false;
let isMuted = false;
let isVideoEnabled = true;
let currentCallType = 'video';
let pendingCall = null;

if (username) {
  if (!deviceId) {
    deviceId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  usernameInput.value = username;
  if (deviceNameElement) {
    deviceNameElement.textContent = username;
  }
  showChatScreen();
  connect();
}

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  username = usernameInput.value.trim().replace(/[<>'"\\/]/g, '');
  if (username) {
    localStorage.setItem(STORAGE_KEY, username);
    if (!deviceId) {
      deviceId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    if (deviceNameElement) {
      deviceNameElement.textContent = username;
    }
    showChatScreen();
    connect();
  }
});

function showChatScreen() {
  loginScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  document.title = `CHATBOX - ${username}`;
}

function connect(serverUrl = null) {
  let url = serverUrl;
  const isHTTPS = window.location.protocol === 'https:';
  const wsProtocol = isHTTPS ? 'wss://' : 'ws://';
  const httpProtocol = isHTTPS ? 'https://' : 'http://';
  const wsPort = isHTTPS ? '8443' : '8765';
  const httpPort = isHTTPS ? '8443' : '8765';
  
  if (!url) {
    const saved = getSavedServer();
    if (saved) {
      const host = saved.includes(':') ? saved : `${saved}:${window.location.port || httpPort}`;
      url = `${wsProtocol}${host}`;
    } else {
      const currentHost = window.location.hostname;
      const currentPort = window.location.port || httpPort;
      url = `${wsProtocol}${currentHost}:${currentPort}`;
    }
  }
  
  console.log('Conectando ao WebSocket:', url);
  updateConnectionStatus('connecting');
  ws = new WebSocket(url);

  ws.onopen = () => {
    reconnectAttempts = 0;
    updateConnectionStatus('online');
    const hostOnly = url.replace('ws://', '').replace(':8765', '').replace(':8766', '').replace(':80', '').replace(':443', '');
    saveServer(hostOnly);
    
    ws.send(JSON.stringify({ 
      type: 'join', 
      name: username,
      id: deviceId
    }));
    
    enableChat();
    messagesDiv.classList.remove('hidden');
    chatInputArea.classList.remove('hidden');
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    handleMessage(msg);
  };

  ws.onclose = () => {
    updateConnectionStatus('offline');
    disableChat();
    
    if (reconnectAttempts < MAX_RECONNECT) {
      reconnectAttempts++;
      setTimeout(() => connect(serverUrl), 2000 * reconnectAttempts);
    }
  };

  ws.onerror = () => {
    console.error('Erro na conexão WebSocket');
    updateConnectionStatus('offline');
  };
}

function handleMessage(msg) {
  switch (msg.type) {
    case 'init':
      deviceId = msg.device_id;
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
      if (deviceNameElement && msg.device_name) {
        deviceNameElement.textContent = msg.device_name;
      }
        if (msg.messages && msg.messages.length > 0) {
        msg.messages.forEach(addMessage);
        renderPinnedSection();
      }
      break;
      
    case 'message':
      addMessage(msg);
      break;
      
    case 'system':
      addSystemMessage(msg);
      break;
      
    case 'typing':
      handleTypingIndicator(msg);
      break;
      
    case 'user_list':
      userList = msg.users || [];
      break;

    case 'chat_cleared':
      messagesDiv.innerHTML = '';
      allMessages = [];
      chatPlaceholder.classList.remove('hidden');
      break;
      
    case 'call_request':
      handleCallRequest(msg);
      break;
      
    case 'call_answer':
      handleCallAnswer(msg);
      break;
      
    case 'call_ice':
      handleCallIce(msg);
      break;
      
    case 'call_end':
      handleCallEnd();
      break;
      
    case 'message_read':
      const ownMessages = allMessages.filter(m => m.is_own);
      ownMessages.forEach(m => {
        if (m.element) {
          m.element.classList.add('read');
        }
        m.status = 'read';
      });
      break;

    case 'message_updated':
      handleMessageUpdated(msg);
      break;

    case 'message_deleted':
      handleMessageDeleted(msg.id);
      break;
  }
}

function handleMessageUpdated(data) {
  let msg = allMessages.find(m => m.id === data.message_id);
  
  // If message not found locally, add it from the server data
  if (!msg && data.message) {
    msg = data.message;
    allMessages.push(msg);
  }
  
  if (msg) {
    if (data.is_favorite !== undefined) {
      msg.is_favorite = data.is_favorite;
    }
    if (data.is_pinned !== undefined) {
      msg.is_pinned = data.is_pinned;
    }
    
    // Update the message element classes
    if (msg.element) {
      if (msg.is_pinned === 1) {
        msg.element.classList.add('pinned');
      } else {
        msg.element.classList.remove('pinned');
      }
      if (msg.is_favorite === 1) {
        msg.element.classList.add('favorite');
      } else {
        msg.element.classList.remove('favorite');
      }
    }
    
    renderPinnedSection();
  }
}

function handleMessageDeleted(messageId) {
  console.log('handleMessageDeleted called:', messageId);
  console.log('allMessages count:', allMessages.length);
  const msgIndex = allMessages.findIndex(m => m.id === messageId);
  console.log('msgIndex found:', msgIndex);
  if (msgIndex !== -1) {
    const msg = allMessages[msgIndex];
    console.log('Removing message:', msg.id);
    if (msg.element) {
      msg.element.remove();
      console.log('Element removed from DOM');
    }
    allMessages.splice(msgIndex, 1);
    renderPinnedSection();
    
    if (allMessages.length === 0) {
      chatPlaceholder.classList.remove('hidden');
    }
  } else {
    console.log('Message not found in allMessages array');
  }
}

function renderPinnedSection() {
  const pinnedSection = document.getElementById('pinned-section');
  const pinnedMsgs = allMessages.filter(m => m.is_pinned === 1).slice(-5);
  
  if (pinnedMsgs.length === 0) {
    pinnedSection.classList.add('hidden');
    return;
  }
  
  pinnedSection.classList.remove('hidden');
  
  let html = `
    <div class="pinned-header">
      <div class="pinned-header-icon">
        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6l1 1 1-1v-6h5v-2l-2-2z"/></svg>
      </div>
      <span class="pinned-header-text">Mensagens fixadas (${pinnedMsgs.length}/5)</span>
    </div>
    <div class="pinned-list">
  `;
  
  pinnedMsgs.forEach(msg => {
    html += `
      <div class="pinned-card" onclick="scrollToMessage('${msg.id}')">
        <button class="pinned-card-close" onclick="event.stopPropagation(); togglePinned('${msg.id}')">
          <svg viewBox="0 0 24 24" width="12" height="12"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
        <div class="pinned-card-name">${escapeHtml(msg.device_name || msg.name || 'Unknown')}</div>
        <div class="pinned-card-text">${escapeHtml(msg.content || msg.text || '')}</div>
      </div>
    `;
  });
  
  html += '</div>';
  pinnedSection.innerHTML = html;
}

function getFileIcon(fileType) {
  const icons = {
    pdf: '📄',
    apk: '📱',
    audio: '🎵',
    video: '🎬',
    archive: '📦',
    doc: '📝',
    default: '📎'
  };
  return icons[fileType] || icons.default;
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function downloadFile(fileData, fileName) {
  const link = document.createElement('a');
  link.href = fileData;
  link.download = fileName;
  link.click();
}

function scrollToMessage(messageId) {
  const msg = allMessages.find(m => m.id === messageId);
  if (msg && msg.element) {
    msg.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    msg.element.classList.add('highlight');
    setTimeout(() => msg.element.classList.remove('highlight'), 2000);
  }
}

function toggleFavorite(messageId) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'toggle_favorite',
      message_id: messageId
    }));
  }
}

function togglePinned(messageId) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'toggle_pinned',
      message_id: messageId
    }));
  }
}

function deleteMessage(messageId) {
  console.log('deleteMessage called:', messageId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'delete',
      id: messageId
    }));
  }
}

let lastMessageDate = null;

function addMessage(msg) {
  chatPlaceholder.classList.add('hidden');
  messagesDiv.classList.remove('hidden');
  chatInputArea.classList.remove('hidden');
  enableChat();
  
  const msgDate = new Date(msg.timestamp || msg.time);
  const dateKey = msgDate.toDateString();
  
  if (lastMessageDate !== dateKey) {
    const dateDiv = document.createElement('div');
    dateDiv.className = 'date-divider';
    const dateText = formatDateDivider(msgDate);
    dateDiv.textContent = dateText;
    messagesDiv.appendChild(dateDiv);
    lastMessageDate = dateKey;
  }
  
  const div = document.createElement('div');
  const isOwn = msg.device_id === deviceId;
  let statusClass = '';
  if (isOwn) {
    statusClass = msg.status === 'read' ? 'own read' : 'own sent';
  }
  div.className = `message ${isOwn ? 'own' : 'other'} ${statusClass}`;
  
  if (msg.is_pinned === 1) div.classList.add('pinned');
  if (msg.is_favorite === 1) div.classList.add('favorite');
  
  const time = msgDate.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  const fullDate = msgDate.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  div.title = fullDate;

  let content = '';
  if (!isOwn) {
    const nameColor = msg.name_color || '#128c7e';
    content += `<div class="message-name" style="color: ${nameColor}">${escapeHtml(msg.device_name || msg.name)}</div>`;
  }
  
  if (msg.content || msg.text) {
    const hasFile = msg.file && !msg.image && !msg.audio;
    if (!hasFile) {
      content += `<div class="message-text">${msg.content || msg.text}</div>`;
    }
  }
  
  if (msg.image) {
    content += `<img src="${msg.image}" class="message-image" alt="imagem">`;
  }
  
  if (msg.audio) {
    content += `
      <div class="message-audio">
        <audio controls src="${msg.audio}"></audio>
      </div>
    `;
  }
  
  if (msg.file && !msg.image && !msg.audio) {
    const fileIcon = getFileIcon(msg.file_type);
    const fileSize = formatFileSize(msg.file_size);
    const fileName = msg.file_name || 'Arquivo';
    content += `
      <div class="message-file" ondblclick="downloadFile('${msg.file}', '${fileName}')">
        <div class="file-icon-left">${fileIcon}</div>
        <div class="file-details">
          <div class="file-name-row">
            <div class="file-name">${escapeHtml(fileName)}</div>
            <div class="file-size">${fileSize}</div>
          </div>
        </div>
      </div>
    `;
  }
  
  content += `<div class="message-time">${time}</div>`;
  content += `
    <div class="favorite-star">
      <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
    </div>
    <div class="message-actions-btn" onclick="event.stopPropagation(); toggleMessageMenu('${msg.id}', event)">
      <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
    </div>
  `;

  div.innerHTML = content;
  div.dataset.messageId = msg.id;
  messagesDiv.appendChild(div);
  
  const codeEls = div.querySelectorAll('code');
  codeEls.forEach(codeEl => {
    codeEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      copyToClipboard(codeEl.textContent, codeEl);
    });
  });
  
  const linkEls = div.querySelectorAll('a');
  linkEls.forEach(linkEl => {
    linkEl.addEventListener('click', (e) => {
      e.preventDefault();
      const url = linkEl.getAttribute('href');
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    });
  });
  
  msg.element = div;
  allMessages.push(msg);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  
  if (!isOwn) {
    playMessageSound();
    sendReadReceipt(msg.id);
  }
}

function sendReadReceipt(messageId) {
  if (ws && ws.readyState === WebSocket.OPEN && messageId) {
    ws.send(JSON.stringify({
      type: 'message_read',
      message_id: messageId
    }));
  }
}

function markMessagesAsRead() {
  const unreadMessages = allMessages.filter(m => !m.is_own && m.id !== lastReadMessageId);
  if (unreadMessages.length > 0) {
    const lastMsg = unreadMessages[unreadMessages.length - 1];
    lastReadMessageId = lastMsg.id;
    sendReadReceipt(lastMsg.id);
  }
}

let currentMessageMenu = null;

function toggleMessageMenu(messageId, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  const msg = allMessages.find(m => m.id === messageId);
  if (!msg) {
    console.log('toggleMessageMenu: mensagem não encontrada');
    return;
  }
  
  console.log('toggleMessageMenu - inicio:', {
    messageId: messageId,
    msgDeviceId: msg.device_id,
    storedDeviceId: localStorage.getItem(DEVICE_ID_KEY),
    deviceId: deviceId
  });
  
  const existingMenu = document.querySelector('.message-menu');
  if (existingMenu) {
    existingMenu.remove();
  }
  
  const msgElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
  if (!msgElement) return;
  
  const menu = document.createElement('div');
  menu.className = 'message-menu show';
  
  const currentDeviceId = localStorage.getItem(DEVICE_ID_KEY);
  const isOwnMsg = msg.device_id === currentDeviceId;
  console.log('isOwnMsg calculado:', isOwnMsg);
  
  const favItem = document.createElement('div');
  favItem.className = 'message-menu-item favorite' + (msg.is_favorite ? ' active' : '');
  favItem.innerHTML = `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg><span>${msg.is_favorite ? 'Remover favorito' : 'Favoritar'}</span>`;
  favItem.addEventListener('click', () => {
    toggleFavorite(messageId);
    menu.remove();
  });
  
  const pinItem = document.createElement('div');
  pinItem.className = 'message-menu-item pinned' + (msg.is_pinned ? ' active' : '');
  pinItem.innerHTML = `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6l1 1 1-1v-6h5v-2l-2-2z"/></svg><span>${msg.is_pinned ? 'Desafixar' : 'Fixar mensagem'}</span>`;
  pinItem.addEventListener('click', () => {
    togglePinned(messageId);
    menu.remove();
  });
  
  menu.appendChild(favItem);
  menu.appendChild(pinItem);
  
  if (isOwnMsg) {
    const deleteItem = document.createElement('div');
    deleteItem.className = 'message-menu-item delete';
    deleteItem.innerHTML = `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg><span>Excluir</span>`;
    deleteItem.addEventListener('click', () => {
      deleteMessage(messageId);
      menu.remove();
    });
    menu.appendChild(deleteItem);
  }
  
  msgElement.appendChild(menu);
  currentMessageMenu = menu;
  
  setTimeout(() => {
    document.addEventListener('click', closeMessageMenu);
  }, 100);
}

function closeMessageMenu(e) {
  if (!e.target.closest('.message-menu')) {
    const menu = document.querySelector('.message-menu');
    if (menu) {
      menu.remove();
    }
    document.removeEventListener('click', closeMessageMenu);
  }
}

function formatDateDivider(date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Hoje';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Ontem';
  } else {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }
}

function addSystemMessage(msg) {
  messagesDiv.classList.remove('hidden');
  chatInputArea.classList.remove('hidden');
  
  const div = document.createElement('div');
  div.className = 'message system';
  div.textContent = msg.text;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

let typingTimeout = null;
let typingIndicatorTimeout = null;

function handleTypingIndicator(msg) {
  showTypingIndicator(msg.name);
}

function showTypingIndicator(name) {
  let typingEl = document.getElementById('typing-indicator');
  
  if (!typingEl) {
    typingEl = document.createElement('div');
    typingEl.id = 'typing-indicator';
    typingEl.className = 'typing-indicator';
    typingEl.innerHTML = `
      <span class="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </span>
      <span class="typing-text"></span>
    `;
    messagesDiv.appendChild(typingEl);
  }
  
  typingEl.querySelector('.typing-text').textContent = `${name} está digitando...`;
  typingEl.classList.remove('hidden');
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  
  clearTimeout(typingIndicatorTimeout);
  typingIndicatorTimeout = setTimeout(() => {
    typingEl.classList.add('hidden');
  }, 3000);
}

function sendTyping() {
  clearTimeout(typingTimeout);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'typing' }));
  }
  typingTimeout = setTimeout(() => {}, 0);
}

function updateConnectionStatus(status) {
  if (status === 'online') {
    connectionStatus.textContent = 'online';
    connectionStatus.className = 'header-status online';
  } else if (status === 'connecting') {
    connectionStatus.textContent = 'Conectando...';
    connectionStatus.className = 'header-status';
  } else {
    connectionStatus.textContent = 'Offline';
    connectionStatus.className = 'header-status';
  }
}

function enableChat() {
  messageInput.contentEditable = 'true';
  sendBtn.disabled = false;
  messageInput.focus();
}

function disableChat() {
  messageInput.contentEditable = 'false';
  sendBtn.disabled = true;
}

clearBtn.addEventListener('click', () => {
  confirmModal.classList.remove('hidden');
});

confirmCancel.addEventListener('click', () => {
  confirmModal.classList.add('hidden');
});

confirmOk.addEventListener('click', () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'clear_chat' }));
    messagesDiv.innerHTML = '';
  }
  confirmModal.classList.add('hidden');
});

const messageFormElement = document.getElementById('message-form');
messageFormElement.addEventListener('submit', (e) => {
  e.preventDefault();
  sendMessage();
});

sendBtn.addEventListener('click', () => {
  sendMessage();
});

function sendMessage() {
  const text = htmlToMarkdown(messageInput).trim();
  if (text && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'message', text }));
    messageInput.innerHTML = '';
    messageInput.style.height = 'auto';
  }
}

messageInput.addEventListener('keydown', (e) => {
  if (mentionDropdown && !mentionDropdown.classList.contains('hidden')) {
    if (e.key === 'Escape') { hideMentionDropdown(); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      const sel = document.querySelector('#mention-list .mention-item.selected');
      if (sel) { sel.click(); return; }
      const first = document.querySelector('#mention-list .mention-item');
      if (first) { first.click(); return; }
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const items = document.querySelectorAll('#mention-list .mention-item');
      if (items.length === 0) return;
      let idx = Array.from(items).indexOf(document.querySelector('#mention-list .mention-item.selected'));
      if (e.key === 'ArrowDown') idx = (idx + 1) % items.length;
      else idx = (idx - 1 + items.length) % items.length;
      items.forEach(i => i.classList.remove('selected'));
      items[idx].classList.add('selected');
      return;
    }
  }
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function copyToClipboard(text, element) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showCopyFeedback(element, 'Copiado!');
    }).catch(() => {
      fallbackCopy(text, element);
    });
  } else {
    fallbackCopy(text, element);
  }
}

function fallbackCopy(text, element) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    const success = document.execCommand('copy');
    showCopyFeedback(element, success ? 'Copiado!' : 'Erro ao copiar');
  } catch {
    showCopyFeedback(element, 'Erro ao copiar');
  }
  document.body.removeChild(textarea);
}

function showCopyFeedback(element, message) {
  element.title = message;
  setTimeout(() => element.title = '', 2000);
}

messagesDiv.addEventListener('click', (e) => {
  const codeEl = e.target.closest('code');
  if (codeEl) {
    e.preventDefault();
    e.stopPropagation();
    copyToClipboard(codeEl.textContent, codeEl);
  }
});

messagesDiv.addEventListener('scroll', () => {
  const scrollBottom = messagesDiv.scrollHeight - messagesDiv.scrollTop - messagesDiv.clientHeight;
  if (scrollBottom < 100) {
    markMessagesAsRead();
  }
});

messageInput.addEventListener('focus', () => {
  markMessagesAsRead();
});

messageInput.addEventListener('input', () => {
  sendTyping();
  messageInput.style.height = 'auto';
  messageInput.style.height = messageInput.scrollHeight + 'px';
  checkForMention();
});

messageInput.addEventListener('paste', (e) => {
  e.preventDefault();
  const text = (e.clipboardData || window.clipboardData).getData('text/plain');
  document.execCommand('insertText', false, text);
});

const formatToolbar = document.getElementById('format-toolbar');
if (formatToolbar) {
  formatToolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('.format-btn');
    if (!btn) return;
    
    const format = btn.dataset.format;
    const sel = window.getSelection();
    const selectedText = sel.toString();
    
    let tag = '';
    let placeholder = '';
    switch (format) {
      case 'bold':
        tag = 'b';
        placeholder = 'negrito';
        break;
      case 'italic':
        tag = 'i';
        placeholder = 'itálico';
        break;
      case 'strike':
        tag = 'del';
        placeholder = 'tachado';
        break;
      case 'code':
        tag = 'code';
        placeholder = 'código';
        break;
    }
    
    if (!tag) return;
    
    messageInput.focus();
    const content = selectedText || placeholder;
    const html = `<${tag}>${content}</${tag}>`;
    
    if (sel.rangeCount) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const frag = document.createRange().createContextualFragment(html);
      const lastNode = frag.lastChild;
      range.insertNode(frag);
      if (lastNode) {
        range.setStartAfter(lastNode);
        range.setEndAfter(lastNode);
      }
      sel.removeAllRanges();
      sel.addRange(range);
    }
    
    messageInput.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      let fileType = 'file';
      let fileIcon = '📎';
      let displayText = file.name;
      
      if (file.type.startsWith('image/')) {
        fileType = 'image';
        fileIcon = '🖼️';
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        fileType = 'pdf';
        fileIcon = '📄';
        displayText = file.name;
      } else if (file.type === 'application/vnd.android.package-archive' || file.name.endsWith('.apk')) {
        fileType = 'apk';
        fileIcon = '📱';
        displayText = file.name;
      } else if (file.type.startsWith('audio/') || file.name.endsWith('.mp3') || file.name.endsWith('.m4a')) {
        fileType = 'audio';
        fileIcon = '🎵';
        displayText = file.name;
      } else if (file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.mov')) {
        fileType = 'video';
        fileIcon = '🎬';
        displayText = file.name;
      } else if (file.name.endsWith('.zip') || file.name.endsWith('.rar')) {
        fileType = 'archive';
        fileIcon = '📦';
        displayText = file.name;
      }
      
      const messageData = {
        type: 'message',
        text: displayText,
        file_name: file.name,
        file_size: file.size,
        file_type: fileType
      };
      
      if (fileType === 'image') {
        messageData.image = reader.result;
      } else {
        messageData.file = reader.result;
      }
      
      ws.send(JSON.stringify(messageData));
    }
  };
  
  reader.readAsDataURL(file);
  fileInput.value = '';
});

audioBtn.addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunks.push(e.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onload = () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ 
            type: 'message', 
            text: '[Áudio]',
            audio: reader.result 
          }));
        }
      };
      reader.readAsDataURL(audioBlob);
      stream.getTracks().forEach(track => track.stop());
    };
    
    mediaRecorder.start();
    recordingStartTime = Date.now();
    audioBtn.classList.add('hidden');
    stopAudioBtn.classList.remove('hidden');
    audioRecording.classList.remove('hidden');
    
    recordingInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      recordingTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
    
  } catch (err) {
    console.error('Erro ao gravar áudio:', err);
    alert('Não foi possível acessar o microfone. Verifique as permissões.');
  }
});

stopAudioBtn.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    clearInterval(recordingInterval);
    audioBtn.classList.remove('hidden');
    stopAudioBtn.classList.add('hidden');
    audioRecording.classList.add('hidden');
    recordingTime.textContent = '0:00';
  }
});

searchBtn.addEventListener('click', () => {
  searchModal.classList.remove('hidden');
  searchText.value = '';
  searchUser.innerHTML = '<option value="">Todos os usuários</option>';
  const users = [...new Set(allMessages.map(m => m.device_name).filter(Boolean))];
  users.forEach(user => {
    const opt = document.createElement('option');
    opt.value = user;
    opt.textContent = user;
    searchUser.appendChild(opt);
  });
  searchResults.innerHTML = '';
  performSearch();
});

searchText.addEventListener('input', performSearch);
searchUser.addEventListener('change', performSearch);
searchFavorites.addEventListener('change', performSearch);
searchUser.addEventListener('change', performSearch);

closeSearch.addEventListener('click', () => {
  searchModal.classList.add('hidden');
});

function performSearch() {
  const text = searchText.value.toLowerCase();
  const user = searchUser.value;
  const onlyFavorites = searchFavorites.checked;
  
  let results = allMessages.filter(m => {
    const matchText = !text || (m.content || m.text || '').toLowerCase().includes(text);
    const matchUser = !user || m.device_name === user;
    const matchFavorite = !onlyFavorites || m.is_favorite;
    return matchText && matchUser && matchFavorite;
  });
  
  if (results.length === 0) {
    searchResults.innerHTML = '<div class="search-no-results">Nenhuma mensagem encontrada</div>';
    return;
  }
  
  searchResults.innerHTML = '';
  results.slice(-20).reverse().forEach(msg => {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    const time = new Date(msg.timestamp || msg.time);
    item.innerHTML = `
      ${msg.is_favorite ? '<span style="color: #FFD700">⭐</span>' : ''}
      <div class="search-result-name" style="color: ${msg.name_color || '#128c7e'}">${escapeHtml(msg.device_name || msg.name)}</div>
      <div class="search-result-text">${msg.content || msg.text}</div>
      <div class="search-result-time">${time.toLocaleString('pt-BR')}</div>
    `;
    item.onclick = () => {
      searchModal.classList.add('hidden');
      msg.element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      msg.element?.classList.add('highlight');
      setTimeout(() => msg.element?.classList.remove('highlight'), 2000);
    };
    searchResults.appendChild(item);
  });
}

function showDiscoverModal() {
  discoverModal.classList.remove('hidden');
  serverListDiv.innerHTML = '<p>Buscando servidores...</p>';
  
  discoverServers().then(servers => {
    if (servers.length === 0) {
      serverListDiv.innerHTML = '<p>Nenhum servidor encontrado na rede.<br>Conecte-se manualmente.</p>';
    } else {
      serverListDiv.innerHTML = '';
      servers.forEach(server => {
        const div = document.createElement('div');
        div.className = 'server-item';
        div.innerHTML = `<strong>${server.name}</strong><br>${server.ip}:${server.wsPort}`;
        div.onclick = () => {
          connect(`ws://${server.ip}:${server.wsPort}`);
          discoverModal.classList.add('hidden');
        };
        serverListDiv.appendChild(div);
      });
    }
  });
}

const savedServer = getSavedServer();
if (!savedServer && username) {
  showDiscoverModal();
}

connectManualBtn.addEventListener('click', () => {
  let ip = manualIpInput.value.trim();
  if (ip) {
    if (!ip.includes(':')) {
      ip = `${ip}:8765`;
    }
    connect(`ws://${ip}`);
    discoverModal.classList.add('hidden');
  }
});

closeModalBtn.addEventListener('click', () => {
  discoverModal.classList.add('hidden');
});

function discoverServers() {
  return new Promise((resolve) => {
    const socket = new WebSocket(`ws://localhost:${window.location.port || 8765}`);
    socket.onopen = () => {
      socket.close();
      resolve([{ name: 'Servidor Local', ip: 'localhost', wsPort: window.location.port || 8765 }]);
    };
    socket.onerror = () => {
      resolve([]);
    };
    setTimeout(() => resolve([]), 3000);
  });
}

function getSavedServer() {
  return localStorage.getItem('cirebox_server');
}

function saveServer(server) {
  localStorage.setItem('cirebox_server', server);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

let mentionQuery = '';

function userNameColor(name) {
  const colors = ['#e91e63','#9c27b0','#673ab7','#3f51b5','#2196f3','#03a9f4','#00bcd4','#009688','#4caf50','#8bc34a','#ff9800','#ff5722'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function createMentionDropdown() {
  const div = document.createElement('div');
  div.id = 'mention-dropdown';
  div.className = 'mention-dropdown hidden';
  div.innerHTML = '<div class="mention-list" id="mention-list"></div>';
  const container = document.getElementById('chat-input-area');
  container.insertBefore(div, container.firstChild);
  return div;
}

let mentionSuppress = false;

function checkForMention() {
  if (mentionSuppress) return;
  const text = messageInput.textContent;
  const atIndex = text.lastIndexOf('@');

  if (atIndex === -1 || (atIndex > 0 && text[atIndex - 1] !== ' ' && text[atIndex - 1] !== '\n')) {
    hideMentionDropdown();
    return;
  }

  const afterAt = text.substring(atIndex + 1);
  if (afterAt.includes(' ')) {
    hideMentionDropdown();
    return;
  }

  mentionStartPos = atIndex;
  mentionQuery = afterAt;
  if (!mentionDropdown) mentionDropdown = createMentionDropdown();
  renderMentionList(afterAt);
  if (mentionDropdown) mentionDropdown.classList.remove('hidden');
}

function getMentionUsers() {
  const fromList = (userList || []).map(u => u.name).filter(Boolean);
  const fromMsgs = [...new Set(allMessages.map(m => m.device_name).filter(Boolean))];
  const merged = [...new Set([...fromList, ...fromMsgs])];
  return merged.filter(n => n !== username);
}

function renderMentionList(q) {
  const list = document.getElementById('mention-list');
  if (!list) return;
  const users = getMentionUsers().filter(n => n.toLowerCase().startsWith(q.toLowerCase()));
  list.innerHTML = '';
  if (users.length === 0) {
    list.innerHTML = '<div class="mention-empty">Nenhum usuário encontrado</div>';
    return;
  }
  users.forEach(name => {
    const color = userNameColor(name);
    const initial = name.charAt(0).toUpperCase();
    const item = document.createElement('div');
    item.className = 'mention-item';
    item.innerHTML = `<span class="mention-badge" style="background:${color}">${initial}</span><span class="mention-name">@${name}</span>`;
    item.onclick = () => insertMention(name);
    list.appendChild(item);
  });
  list.querySelector('.mention-item').classList.add('selected');
}

function insertMention(name) {
  mentionSuppress = true;
  const text = messageInput.textContent;
  const before = text.substring(0, mentionStartPos);
  const after = text.substring(mentionStartPos + mentionQuery.length + 1).replace(/^ /, '');
  messageInput.textContent = before + `@${name} ` + after;
  messageInput.focus();
  hideMentionDropdown();
  mentionSuppress = false;
  messageInput.dispatchEvent(new Event('input', { bubbles: true }));
}

function hideMentionDropdown() {
  if (mentionDropdown) mentionDropdown.classList.add('hidden');
  mentionStartPos = -1;
  mentionQuery = '';
}

document.addEventListener('click', (e) => {
  if (mentionDropdown && !mentionDropdown.classList.contains('hidden') && !mentionDropdown.contains(e.target)) {
    hideMentionDropdown();
    messageInput.focus();
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('SW registrado:', reg.scope))
      .catch((err) => console.log('SW erro:', err));
  });
}

const pwaBanner = document.getElementById('pwa-banner');
const pwaInstallBtn = document.getElementById('pwa-install-btn');
const pwaCloseBtn = document.getElementById('pwa-close-btn');

let deferredPrompt = null;

function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         window.matchMedia('(max-width: 768px)').matches;
}

function showPwaBanner() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       window.navigator.standalone === true;
  
  if (!isStandalone && localStorage.getItem('pwa_dismissed') !== 'true' && isMobileDevice()) {
    pwaBanner.classList.remove('hidden');
  }
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showPwaBanner();
});

window.addEventListener('load', () => {
  setTimeout(showPwaBanner, 2000);
});

pwaInstallBtn.addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      document.body.classList.add('pwa-installed');
    }
    deferredPrompt = null;
    pwaBanner.classList.add('hidden');
  } else {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    let message = 'Para instalar o CHATBOX como app:';
    if (isAndroid) {
      message += '\n\n1. Toque no menu (3 pontos)\n2. Selecione "Adicionar à tela inicial"';
    } else if (isIOS) {
      message += '\n\n1. Toque em Compartilhar\n2. Selecione "Adicionar à Tela de Início"';
    } else {
      message += '\n\nUse o menu do navegador para adicionar à tela inicial.';
    }
    alert(message);
  }
});

pwaCloseBtn.addEventListener('click', () => {
  pwaBanner.classList.add('hidden');
  localStorage.setItem('pwa_dismissed', 'true');
});

window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
  if (e.matches) {
    document.body.classList.add('pwa-installed');
    pwaBanner.classList.add('hidden');
  }
});

const rtcConfig = {
  iceServers: [],
  iceCandidatePoolSize: 10
};

async function startCall(callType) {
  if (isInCall) return;
  
  const isLocalhost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';
  const isHTTPS = window.location.protocol === 'https:';
  
  if (!isLocalhost && !isHTTPS) {
    alert('Chamadas requerem HTTPS. Acesse via https:// ou use localhost.');
    return;
  }
  
  try {
    const constraints = {
      audio: true,
      video: callType === 'video'
    };
    
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    currentCallType = callType;
    
    peerConnection = new RTCPeerConnection(rtcConfig);
    
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });
    
    peerConnection.ontrack = (event) => {
      remoteVideo.srcObject = event.streams[0];
    };
    
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'call_ice',
          candidate: event.candidate
        }));
      }
    };
    
    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: callType === 'video'
    });
    await peerConnection.setLocalDescription(offer);
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'call_request',
        call_type: callType,
        sdp: offer
      }));
    }
    
    showCallScreen(callType);
    
  } catch (err) {
    console.error('Erro ao iniciar chamada:', err);
    alert('Não foi possível acessar a câmera/microfone. Verifique as permissões.');
  }
}

function showCallScreen(callType) {
  isInCall = true;
  localVideo.srcObject = localStream;
  callPartnerName.textContent = 'Chamando...';
  callTypeLabel.textContent = callType === 'video' ? 'Vídeo' : 'Áudio';
  callScreen.classList.remove('hidden');
  
  if (callType === 'audio') {
    localVideo.style.display = 'none';
  } else {
    localVideo.style.display = 'block';
  }
}

function endCall() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  
  isInCall = false;
  callScreen.classList.add('hidden');
  remoteVideo.srcObject = null;
  localVideo.srcObject = null;
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'call_end' }));
  }
}

function handleCallRequest(msg) {
  pendingCall = msg;
  incomingCallName.textContent = msg.from;
  incomingCallStatus.textContent = msg.call_type === 'video' ? 'Chamada de vídeo' : 'Chamada de áudio';
  incomingCallModal.classList.remove('hidden');
}

function handleCallAnswer(msg) {
  if (!peerConnection) return;
  
  if (msg.accepted && msg.sdp) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp));
    callPartnerName.textContent = pendingCall ? pendingCall.from : 'Chamada';
  } else {
    addSystemMessage({ text: `${msg.from} rejeitou a chamada` });
    endCall();
  }
}

function handleCallIce(msg) {
  if (peerConnection && msg.candidate) {
    peerConnection.addIceCandidate(new RTCIceCandidate(msg.candidate));
  }
}

function handleCallEnd() {
  if (isInCall) {
    endCall();
    addSystemMessage({ text: 'Chamada encerrada' });
  }
}

function checkCallSupport() {
  const isLocalhost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';
  const isHTTPS = window.location.protocol === 'https:';
  
  if (!isLocalhost && !isHTTPS) {
    callAudioBtn.disabled = true;
    callVideoBtn.disabled = true;
    callAudioBtn.title = 'Chamadas requerem HTTPS';
    callVideoBtn.title = 'Chamadas requerem HTTPS';
    callAudioBtn.style.opacity = '0.5';
    callVideoBtn.style.opacity = '0.5';
  }
}

checkCallSupport();

callAudioBtn.addEventListener('click', () => startCall('audio'));
callVideoBtn.addEventListener('click', () => startCall('video'));

acceptCallBtn.addEventListener('click', async () => {
  if (!pendingCall) return;
  
  const isLocalhost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';
  const isHTTPS = window.location.protocol === 'https:';
  
  if (!isLocalhost && !isHTTPS) {
    alert('Chamadas requerem HTTPS. Acesse via https:// ou use localhost.');
    incomingCallModal.classList.add('hidden');
    pendingCall = null;
    return;
  }
  
  incomingCallModal.classList.add('hidden');
  
  try {
    const constraints = {
      audio: true,
      video: pendingCall.call_type === 'video'
    };
    
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    currentCallType = pendingCall.call_type;
    
    peerConnection = new RTCPeerConnection(rtcConfig);
    
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });
    
    peerConnection.ontrack = (event) => {
      remoteVideo.srcObject = event.streams[0];
    };
    
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'call_ice',
          candidate: event.candidate
        }));
      }
    };
    
    if (pendingCall.sdp) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(pendingCall.sdp));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      ws.send(JSON.stringify({
        type: 'call_answer',
        accepted: true,
        sdp: answer
      }));
    }
    
    showCallScreen(pendingCall.call_type);
    callPartnerName.textContent = pendingCall.from;
    pendingCall = null;
    
  } catch (err) {
    console.error('Erro ao aceitar chamada:', err);
    ws.send(JSON.stringify({ type: 'call_answer', accepted: false }));
  }
});

rejectCallBtn.addEventListener('click', () => {
  incomingCallModal.classList.add('hidden');
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'call_answer', accepted: false }));
  }
  pendingCall = null;
});

toggleMuteBtn.addEventListener('click', () => {
  if (localStream) {
    isMuted = !isMuted;
    localStream.getAudioTracks().forEach(track => {
      track.enabled = !isMuted;
    });
    toggleMuteBtn.classList.toggle('active', !isMuted);
  }
});

toggleVideoBtn.addEventListener('click', () => {
  if (localStream) {
    isVideoEnabled = !isVideoEnabled;
    localStream.getVideoTracks().forEach(track => {
      track.enabled = isVideoEnabled;
    });
    toggleVideoBtn.classList.toggle('active', isVideoEnabled);
    localVideo.style.opacity = isVideoEnabled ? '1' : '0';
  }
});

endCallBtn.addEventListener('click', endCall);
