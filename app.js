// ==========================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ==========================================
let socket;
let currentUser = null;
let currentChat = null; 
let serverUrl = localStorage.getItem('serverUrl') || '';

// Настройки захвата микрофона (сырое аудио, без агрессивной обработки)
const MIC_CONSTRAINTS = {
    audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
    },
    video: false
};

let sidebarChats = []; 

// WebRTC / Звонки
let localStream = null;
let currentPeer = null;
let incomingCallData = null;
let incomingSignalQueue = [];
let currentAudioDevice = null;
let currentVideoDevice = null;
let isScreenSharing = false;

let callPartnerId = null;
let lastCallPartnerId = null;
let lastCallEndedAt = 0;
let callAudioCtx = null;
let remoteAudioNode = null;
let remoteAudioEl = null;

// Редактирование / UI
let editingMessageId = null;
let selectedMessageId = null;
let currentGroupDetails = null;

// Криптография
const EC = elliptic.ec;
const ec = new EC('secp256k1');
let myKeyPair = null;
let sharedKeys = {}; // Кеш общих секретов

// ==========================================
// ДАННЫЕ (ЭМОДЗИ И КЛЮЧЕВЫЕ СЛОВА)
// ==========================================

const emojiData = {
    "Smileys": ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","😙","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🤧","🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐","😕","🙁","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖"],
    "Body": ["👋","🤚","🖐","✋","🖖","👌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","🦵","🦶","👂","🦻","👃","🧠","🦷","🦴","👀","👁","👅","👄","💋","🩸"],
    "Love": ["❤️","🧡","💛","💚","💙","💜","🤎","🖤","🤍","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","☮️","✝️","☪️","🕉","☸️","✡️","🔯","🕎","☯️","☦️","🛐","⛎","♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","🆔","⚛️"],
    "Objects": ["💣","🔪","🗡","⚔️","🛡","🚬","⚰️","⚱️","🏺","🔮","📿","🧿","💈","⚗️","🔭","🔬","🕳","🩹","🩺","💊","💉","🩸","🧬","🦠","🧫","🧪","🌡","🧹","🧺","🧻","🚽","🚰","🚿","🛁","🛀","🧼","🪒","🧽","🧴","🛎","🔑","🗝","🚪","🪑","🛋","🛏","🛌","🧸","🖼","🛍","🛍️","🛒","🎁","🎈","🎏","🎀","🎊","🎉","🎎","🏮","🎐","🧧","✉️","📩","📨","📧","💌","📥","📤","📦","🏷","📪","📫","📬","📭","📮","📯","📜","📃","📄","📑","🧾","📊","📈","📉","🗒","🗓","📆","📅","🗑","📇","🗃","🗳","🗄","📋","📁","📂","🗂","🗞","📰","📓","📔","📒","📕","📗","📘","📙","📚","📖","🔖","🧷","🔗","📎","🖇","📐","📏","🧮","📌","📍","✂️","🖊","🖋","✒️","🖌","🖍","📝","✏️","🔍","🔎","🔏","🔐","🔒","🔓"],
    "18+": ["🍆","🍑","🍌","🍒","🌮","🍩","🌭","💦","🛏️","🚿","🔥","👅","💋","👙","👠","💄","🔞"]
};

const keywordMap = {
    "привет": ["👋","🙂","✋"], "пока": ["👋","🚶"], "любовь": ["❤️","😍","🥰"], "сердце": ["❤️","💔","💖"],
    "смешно": ["😂","🤣","😆"], "лол": ["😂","🤣"], "ого": ["😮","😲","🤯"], "ок": ["👌","👍","✅"],
    "да": ["👍","✅"], "нет": ["👎","❌"], "грустно": ["😢","😭","😔"], "злой": ["😡","🤬","😤"],
    "деньги": ["💰","🤑","💵"], "праздник": ["🎉","🥳","🎂"], "пиво": ["🍺","🍻"], "еда": ["🍕","🍔","🍟"],
    "спать": ["😴","🛏️"], "работа": ["💼","💻"], "дом": ["🏠","🏡"], "огонь": ["🔥","💥"],
    "секс": ["👉👌","🍆🍑","🛏️","💦","🔞"], "интим": ["🔞","💋","👙"], "вечеринка": ["🎉🍺","💃🕺","🥳🍾"],
    "люблю": ["❤️🔥","😍","🥰"], "поцелуй": ["😘","💋"], "задница": ["🍑","💩"], "член": ["🍆","🍌"]
};

// ==========================================
// ИНИЦИАЛИЗАЦИЯ
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    if(serverUrl) document.getElementById('server-url').value = serverUrl;
    
    const savedUser = localStorage.getItem('user');
    const savedKey = localStorage.getItem('priv_key_seed');
    
    if (serverUrl && savedUser && savedKey) {
        const userObj = JSON.parse(savedUser);
        // Проверяем валидность сессии
        fetch(`${serverUrl}/api/validate_user`, {
            method: 'POST', 
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id: userObj.id, sessionToken: userObj.sessionToken })
        })
        .then(res => res.json())
        .then(data => {
            if (data.valid) { 
                currentUser = userObj; 
                initCrypto(savedKey); 
                connectToServer(); 
            } else {
                window.logout();
            }
        })
        .catch(err => { 
            // Если сервер не отвечает, пробуем подключиться все равно (офлайн режим или реконнект)
            currentUser = userObj; 
            initCrypto(savedKey); 
            connectToServer(); 
        });
    }
    
    initEmojiPicker();
});

// ==========================================
// КРИПТОГРАФИЯ (ТЕКСТ + ФАЙЛЫ)
// ==========================================

function initCrypto(fileHashHex) { 
    myKeyPair = ec.keyFromPrivate(fileHashHex); 
}

function getSharedSecret(otherPubKeyHex) {
    if(!otherPubKeyHex) return null;
    if(sharedKeys[otherPubKeyHex]) return sharedKeys[otherPubKeyHex];
    try {
        const key = ec.keyFromPublic(otherPubKeyHex, 'hex');
        const shared = myKeyPair.derive(key.getPublic());
        // Берем первые 64 символа (256 бит)
        const secret = shared.toString(16).substring(0, 64);
        sharedKeys[otherPubKeyHex] = secret;
        return secret;
    } catch(e) { 
        console.error("Crypto Error:", e);
        return null; 
    }
}

function encryptText(text, secret) { 
    return secret ? CryptoJS.AES.encrypt(text, secret).toString() : text; 
}

function decryptText(ciphertext, secret) {
    if(!secret) return ciphertext;
    try { 
        const bytes = CryptoJS.AES.decrypt(ciphertext, secret);
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        return originalText || "Ошибка расшифровки"; 
    } catch(e) { 
        return "Ошибка расшифровки"; 
    }
}

// --- WEB CRYPTO API ДЛЯ ФАЙЛОВ ---

async function generateFileKey() {
    return await window.crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

async function encryptFile(file, key) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const arrayBuffer = await file.arrayBuffer();
    const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        arrayBuffer
    );
    return { 
        encryptedBlob: new Blob([encryptedBuffer]), 
        iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('') 
    };
}

async function exportKey(key) {
    const exported = await window.crypto.subtle.exportKey("raw", key);
    return Array.from(new Uint8Array(exported)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function importKey(keyHex) {
    const keyBuffer = new Uint8Array(keyHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    return await window.crypto.subtle.importKey(
        "raw", 
        keyBuffer, 
        "AES-GCM", 
        true, 
        ["encrypt", "decrypt"]
    );
}

async function decryptFile(encryptedBlob, key, ivHex) {
    const iv = new Uint8Array(ivHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const arrayBuffer = await encryptedBlob.arrayBuffer();
    const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        arrayBuffer
    );
    return new Blob([decryptedBuffer]);
}

// ==========================================
// UI HELPERS
// ==========================================

window.switchTab = (tab) => { 
    document.querySelectorAll('form').forEach(f => f.style.display = 'none'); 
    document.getElementById(tab === 'login' ? 'login-form' : 'register-form').style.display = 'block'; 
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); 
    event.target.classList.add('active'); 
};

window.closeModal = (id) => {
    document.getElementById(id).style.display = 'none';
};

window.handleFileSelect = (e) => { 
    const file = e.target.files[0]; 
    if(file) { 
        document.getElementById('file-preview-area').style.display = 'flex'; 
        document.getElementById('preview-filename').textContent = file.name; 
    } else {
        document.getElementById('file-preview-area').style.display = 'none'; 
    }
};

window.clearFileSelection = () => { 
    document.getElementById('file-input').value = ''; 
    document.getElementById('file-preview-area').style.display = 'none'; 
};

// ==========================================
// EMOJI LOGIC
// ==========================================

function initEmojiPicker() {
    const tabsContainer = document.getElementById('emoji-tabs');
    let first = true;
    for (const cat in emojiData) {
        const tab = document.createElement('div'); 
        tab.className = 'emoji-tab' + (first ? ' active' : ''); 
        tab.textContent = cat; 
        tab.onclick = () => switchEmojiTab(cat, tab); 
        tabsContainer.appendChild(tab); 
        if(first) { switchEmojiTab(cat, tab); first = false; }
    }
}

function switchEmojiTab(cat, tabEl) { 
    document.querySelectorAll('.emoji-tab').forEach(t => t.classList.remove('active')); 
    tabEl.classList.add('active'); 
    renderEmojis(emojiData[cat]); 
}

function renderEmojis(list) { 
    const cont = document.getElementById('emoji-list'); 
    cont.innerHTML = list.map(e => `<span onclick="addEmoji('${e}')">${e}</span>`).join(''); 
}

window.filterEmojis = (val) => { 
    if(!val) return switchEmojiTab("Smileys", document.querySelector('.emoji-tab')); 
    // Можно добавить реальную фильтрацию, если нужно
};

window.toggleEmoji = () => { 
    const el = document.getElementById('emoji-picker'); 
    el.style.display = el.style.display === 'none' ? 'flex' : 'none'; 
};

window.addEmoji = (e) => { 
    const input = document.getElementById('message-input'); 
    input.value += e; 
    input.focus(); 
    document.getElementById('emoji-suggestions').style.display = 'none'; 
};

window.handleInput = (e) => {
    const val = e.target.value;
    const words = val.split(' ');
    const lastWord = words[words.length - 1].toLowerCase().replace(/[.,!?;:]/g, "");
    const sugg = document.getElementById('emoji-suggestions');
    if (keywordMap[lastWord]) {
        sugg.innerHTML = keywordMap[lastWord].map(em => `<span onclick="addSuggestion('${em}')">${em}</span>`).join('');
        sugg.style.display = 'flex';
    } else sugg.style.display = 'none';
};

window.addSuggestion = (em) => { 
    const input = document.getElementById('message-input'); 
    input.value += em + " "; 
    document.getElementById('emoji-suggestions').style.display = 'none'; 
    input.focus(); 
};

// ==========================================
// АВТОРИЗАЦИЯ
// ==========================================

window.handleKeyFileSelect = (e) => { 
    const file = e.target.files[0]; 
    if(file) { 
        document.getElementById('key-file-name').textContent = "Ключ: " + file.name; 
        document.getElementById('btn-login').style.display = 'block'; 
    } 
};

window.loginWithKey = async () => {
    let rawUrl = document.getElementById('server-url').value.trim().replace(/\/$/, "");
    if (!rawUrl.startsWith('http')) rawUrl = 'http://' + rawUrl;
    serverUrl = rawUrl;
    
    const file = document.getElementById('auth-key-file').files[0];
    if (!file) return alert("Файл не выбран");
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        
        initCrypto(hashHex);
        const myPubKey = myKeyPair.getPublic('hex');
        
        const res = await fetch(`${serverUrl}/api/login_by_file`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ fileHash: hashHex, publicKey: myPubKey }) 
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        localStorage.setItem('serverUrl', serverUrl); 
        localStorage.setItem('user', JSON.stringify(data)); 
        localStorage.setItem('priv_key_seed', hashHex);
        
        currentUser = data; 
        connectToServer();
    } catch (e) { 
        alert("Ошибка входа: " + e.message); 
    }
};

window.logout = () => { 
    localStorage.clear(); 
    location.reload(); 
};

// ==========================================
// ПРОФИЛЬ
// ==========================================

window.previewEditAvatar = (e) => { 
    const file = e.target.files[0]; 
    if (file) { 
        const reader = new FileReader(); 
        reader.onload = ev => document.getElementById('profile-big-avatar').src = ev.target.result; 
        reader.readAsDataURL(file); 
    } 
};

window.saveProfile = async () => {
    const newNick = document.getElementById('edit-nickname').value;
    const file = document.getElementById('edit-avatar-input').files[0];
    if(!newNick) return alert("Имя не может быть пустым");
    
    const fd = new FormData();
    fd.append('userId', currentUser.id); 
    fd.append('nickname', newNick);
    if(file) fd.append('avatar', file);
    
    try {
        const res = await fetch(`${serverUrl}/api/profile/update`, { method: 'POST', body: fd });
        const updatedUser = await res.json();
        if(updatedUser) { 
            currentUser.nickname = updatedUser.nickname; 
            currentUser.avatar = updatedUser.avatar; 
            localStorage.setItem('user', JSON.stringify(currentUser)); 
            document.getElementById('my-name').textContent = currentUser.nickname; 
            document.getElementById('my-avatar').src = serverUrl + currentUser.avatar; 
            closeModal('profile-modal'); 
            alert("Профиль обновлен"); 
        }
    } catch(e) { alert("Ошибка обновления"); }
};

// ==========================================
// SOCKET.IO & ОСНОВНАЯ ЛОГИКА
// ==========================================

function connectToServer() {
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('main-screen').classList.add('active');
    
    // Set Profile Info
    document.getElementById('my-avatar').src = currentUser.avatar ? serverUrl + currentUser.avatar : 'https://placehold.co/50';
    document.getElementById('my-name').textContent = currentUser.nickname;
    document.getElementById('my-username-small').textContent = '@' + currentUser.username;

    socket = io(serverUrl);
    
    socket.on('connect', () => socket.emit('authenticate', currentUser.id));
    socket.on('sidebar_update', (chats) => { sidebarChats = chats; renderSidebar(); });
    socket.on('search_results', (users) => renderSidebar(users, true));
    socket.on('force_logout', () => window.logout());
    
    socket.on('user_deleted_status', (data) => {
        if(currentChat && currentChat.id === data.id && currentChat.type === 'user') {
            document.getElementById('chat-status').textContent = 'Удален';
        }
        socket.emit('authenticate', currentUser.id);
    });
    
    socket.on('user_revived', () => socket.emit('authenticate', currentUser.id));
    
    // Входящее сообщение
    socket.on('new_message', (msg) => {
        const isCurrentGroup = msg.group_id && currentChat?.type === 'group' && currentChat.id === msg.group_id;
        const isCurrentDM = !msg.group_id && currentChat?.type === 'user' && (msg.sender_id === currentChat.id || msg.sender_id === currentUser.id);

        if (isCurrentGroup || isCurrentDM) {
            renderMessage(msg);
            if(msg.sender_id !== currentUser.id) {
                // Помечаем прочитанным только если чат открыт
                const groupId = msg.group_id || msg.groupId; 
                socket.emit('mark_read', { 
                    messageId: msg.id, 
                    userId: currentUser.id, 
                    groupId: groupId, 
                    senderId: msg.sender_id 
                });
            }
        }
        // Обновляем сайдбар (чтобы поднять чат)
        socket.emit('authenticate', currentUser.id);
    });

    socket.on('message_read_update', (data) => {
        const el = document.querySelector(`.message[data-id="${data.id}"]`);
        if(el) {
            // Find status icon in meta div
            const icon = el.parentNode.querySelector('.status-icon');
            if(icon) icon.className = 'status-icon fas fa-check-double read';
        }
    });

    socket.on('reaction_update', (data) => {
        const el = document.querySelector(`.message[data-id="${data.id}"]`);
        if(el) renderReactions(el, data.reactions);
    });

    socket.on('message_updated', (data) => { 
        document.querySelectorAll('.message').forEach(el => { 
            if(el.dataset.id == data.id) {
                // Внимание: при редактировании текст может быть зашифрован, здесь упрощено
                el.firstChild.textContent = data.content; // Better handle decrypt here too if needed
            }
        }); 
    });
    
    socket.on('message_deleted', (data) => { 
        document.querySelectorAll('.message').forEach(el => { 
            if(el.dataset.id == data.id) el.closest('.msg-row').remove(); 
        }); 
    });
    
    socket.on('history_loaded', (msgs) => { 
        document.getElementById('messages-container').innerHTML = ''; 
        msgs.forEach(renderMessage); 
        
        // Auto-mark history as read
        msgs.forEach(m => {
            const readBy = typeof m.read_by === 'string' ? JSON.parse(m.read_by) : m.read_by;
            if(m.sender_id !== currentUser.id && !readBy.includes(currentUser.id)) {
                socket.emit('mark_read', { messageId: m.id, userId: currentUser.id, groupId: m.group_id, senderId: m.sender_id });
            }
        });
        scrollToBottom(); 
    });

    // ЗВОНКИ
    socket.on('call_incoming', (data) => {
        const sig = data && (data.signal || data.signalData);
        // Если мы сейчас не в звонке и нет входящего звонка, но прилетел не-offer (обычно это поздние ICE-кандидаты) — игнорим.
        // Иначе может "залипнуть" состояние и не получится позвонить повторно без перезагрузки.
        if (!currentPeer && !incomingCallData && sig && sig.type && sig.type !== 'offer') {
            const now = Date.now();
            if (now - lastCallEndedAt < 3000 && data && data.from && data.from === lastCallPartnerId) return;
            return;
        }

        // Если уже в активном звонке — это, скорее всего, trickle ICE от второй стороны
        if (currentPeer && !currentPeer.destroyed && sig) {
            try { currentPeer.signal(sig); } catch (e) { console.warn(e); }
            return;
        }

        // Если уже есть входящий звонок, но ещё не приняли — копим сигналы
        if (incomingCallData && sig) {
            incomingSignalQueue.push(sig);
            return;
        }

        // Если заняты — сообщаем звонящему
        if (currentPeer || incomingCallData) {
            if (data && data.from) socket.emit('call_busy', { to: data.from });
            return;
        }

        incomingCallData = data;
        incomingSignalQueue = [];
        // Первый offer храним в incomingCallData, а не в очереди, чтобы не задублировать
        if (sig) incomingCallData.signal = sig;
document.getElementById('incoming-call-modal').style.display = 'flex';
        document.getElementById('caller-name').textContent = data.name || 'Входящий звонок';
    });

socket.on('call_accepted', (signal) => { 
        if(currentPeer && !currentPeer.destroyed) {
            try { currentPeer.signal(signal); } catch(e) { console.warn(e); }
        }
    });
    
    socket.on('call_busy', () => { alert("Абонент занят"); endCallUI(); });
socket.on('call_ended', () => { endCallUI(); });
// ГРУППЫ
    socket.on('contacts_list', (users) => {
        const list = document.getElementById('group-candidates-list');
        list.innerHTML = '';
        users.forEach(u => {
            if(u.id === currentUser.id) return;
            const div = document.createElement('div');
            const avatar = u.avatar ? serverUrl + u.avatar : 'https://placehold.co/40';
            div.className = 'user-list-item';
            div.innerHTML = `<input type="checkbox" id="user-${u.id}" value="${u.id}" style="margin-right:10px;"><img src="${avatar}"><div class="info"><div class="name">${u.nickname}</div><div class="status">@${u.username}</div></div>`;
            div.onclick = (e) => { if(e.target.tagName !== 'INPUT') { const cb = div.querySelector('input'); cb.checked = !cb.checked; } };
            list.appendChild(div);
        });
        // Populate select for adding members
        const select = document.getElementById('group-add-select');
        select.innerHTML = '';
        users.forEach(u => { const opt = document.createElement('option'); opt.value = u.id; opt.text = u.nickname; select.appendChild(opt); });
    });

    socket.on('group_created', (group) => { 
        closeModal('create-group-modal'); 
        openChat({ id: group.id, name: group.name, avatar: group.avatar, creator_id: group.creator_id }, 'group'); 
    });

    socket.on('group_details_loaded', ({ group, members }) => {
        currentGroupDetails = { group, members };
        document.getElementById('group-info-name').textContent = group.name;
        document.getElementById('group-info-avatar').src = group.avatar ? serverUrl + group.avatar : 'https://placehold.co/100';
        const isAdmin = group.creator_id === currentUser.id;
        document.getElementById('group-admin-tools').style.display = isAdmin ? 'block' : 'none';
        
        if(isAdmin) {
            document.getElementById('group-info-name').style.display = 'none';
            const nameInput = document.getElementById('group-info-name-input'); nameInput.style.display = 'block'; nameInput.value = group.name;
            document.getElementById('group-edit-btn').style.display = 'flex'; 
            document.getElementById('save-group-btn').style.display = 'block';
        } else {
            document.getElementById('group-info-name').style.display = 'block'; 
            document.getElementById('group-info-name-input').style.display = 'none';
            document.getElementById('group-edit-btn').style.display = 'none'; 
            document.getElementById('save-group-btn').style.display = 'none';
        }

        const list = document.getElementById('group-members-list'); list.innerHTML = '';
        members.forEach(m => {
            const div = document.createElement('div');
            const avatar = m.avatar ? serverUrl + m.avatar : 'https://placehold.co/40';
            div.className = 'user-list-item'; div.style.cursor = 'default';
            let kickBtn = ''; if(isAdmin && m.id !== currentUser.id) kickBtn = `<button class="kick-btn" onclick="removeMember(${group.id}, ${m.id})"><i class="fas fa-times"></i></button>`;
            div.innerHTML = `<img src="${avatar}"><div class="info"><div class="name">${m.nickname}</div><div class="status">@${m.username}</div></div>${kickBtn}`;
            if(m.id !== currentUser.id) { div.onclick = (e) => { if(!e.target.closest('.kick-btn')) openUserProfile(m); }; div.style.cursor = 'pointer'; }
            list.appendChild(div);
        });
        document.getElementById('group-info-modal').style.display = 'flex';
    });

    socket.on('group_updated', ({ groupId }) => { 
        if(currentChat && currentChat.id === groupId && currentChat.type === 'group') socket.emit('get_group_details', groupId); 
        socket.emit('authenticate', currentUser.id); 
    });
    
    socket.on('message_readers_list', (users) => {
        const list = document.getElementById('readers-list'); list.innerHTML = '';
        users.forEach(u => { const div = document.createElement('div'); div.className = 'user-list-item'; div.innerHTML = `<img src="${u.avatar ? serverUrl + u.avatar : 'https://placehold.co/40'}"><div class="name">${u.nickname}</div>`; list.appendChild(div); });
        document.getElementById('readers-modal').style.display = 'flex';
    });
}

function renderSidebar(list = null, isSearch = false) {
    const container = document.getElementById('chats-list');
    container.innerHTML = '';
    const data = list || sidebarChats;
    data.forEach(item => {
        if(item.id === currentUser.id && item.type !== 'group') return;
        const el = document.createElement('div');
        el.className = 'chat-item';
        if(currentChat && currentChat.id === item.id && currentChat.type === (item.type || 'user')) el.classList.add('active');
        const avatar = item.avatar ? serverUrl + item.avatar : 'https://placehold.co/50';
        let deletedBadge = item.is_deleted ? '<div class="deleted-overlay"><i class="fas fa-skull"></i></div>' : '';
        el.innerHTML = `<div style="position:relative"><img src="${avatar}">${deletedBadge}</div><div><div style="font-weight:bold">${item.nickname || item.name}</div><div style="font-size:12px; color:#aaa">${item.type === 'group' ? 'Группа' : ''}</div></div>`;
        el.onclick = () => openChat(item, isSearch ? 'user' : (item.type || 'user'));
        container.appendChild(el);
    });
    // Аргумент isSearch, который был в прошлых версиях, здесь опущен, но логика сохранена через замыкание/контекст
}

window.handleSearchKey = (e) => {
    if(e.key === 'Enter') {
        const val = e.target.value;
        if(val) socket.emit('search_users', val);
        else socket.emit('authenticate', currentUser.id);
    }
};

window.handleHeaderClick = () => {
    if(!currentChat) return;
    if(currentChat.type === 'group') {
        socket.emit('get_contacts_for_group', currentUser.id); 
        socket.emit('get_group_details', currentChat.id);
    }
};

// Групповые функции
window.previewGroupAvatar = (e) => { const file = e.target.files[0]; if(file) { const reader = new FileReader(); reader.onload = ev => document.getElementById('new-group-avatar-preview').src = ev.target.result; reader.readAsDataURL(file); } };
window.createGroup = async () => {
    const name = document.getElementById('new-group-name').value;
    const checks = document.querySelectorAll('#group-candidates-list input:checked');
    if(!name) return alert("Введите имя группы");
    const fileInput = document.getElementById('new-group-avatar-input');
    let avatarUrl = null;
    if(fileInput.files[0]) {
        // Upload avatar
        const fd = new FormData(); fd.append('file', fileInput.files[0]); 
        try { const res = await fetch(`${serverUrl}/api/upload_secure`, { method: 'POST', body: fd }); const data = await res.json(); avatarUrl = `/api/file/${data.fileId}`; } catch(e) {} 
    }
    const memberIds = Array.from(checks).map(c => parseInt(c.value));
    socket.emit('create_group', { name, memberIds, creatorId: currentUser.id, avatar: avatarUrl });
};
window.updateGroupAvatar = (e) => { const file = e.target.files[0]; if(file) { const reader = new FileReader(); reader.onload = ev => document.getElementById('group-info-avatar').src = ev.target.result; reader.readAsDataURL(file); } };
window.saveGroupSettings = async () => {
    const name = document.getElementById('group-info-name-input').value;
    const fileInput = document.getElementById('edit-group-avatar-input');
    const fd = new FormData();
    fd.append('groupId', currentGroupDetails.group.id); fd.append('name', name);
    if(fileInput.files[0]) fd.append('avatar', fileInput.files[0]);
    await fetch(`${serverUrl}/api/group/update`, { method: 'POST', body: fd });
    socket.emit('notify_group_update', currentGroupDetails.group.id);
    socket.emit('get_group_details', currentGroupDetails.group.id);
};
window.openCreateGroupModal = () => { document.getElementById('create-group-modal').style.display = 'flex'; socket.emit('get_contacts_for_group', currentUser.id); };
window.addMemberToGroup = () => { const select = document.getElementById('group-add-select'); const userId = parseInt(select.value); if(currentGroupDetails && userId) socket.emit('add_group_member', { groupId: currentGroupDetails.group.id, userId }); };
window.removeMember = (groupId, userId) => { if(confirm("Удалить участника?")) socket.emit('remove_group_member', { groupId, userId }); };

function openChat(obj, type) {
    currentChat = { id: obj.id, type: type, ...obj };
    document.getElementById('chat-placeholder').style.display = 'none';
    document.getElementById('chat-interface').style.display = 'flex';
    document.getElementById('chat-name').textContent = obj.nickname || obj.name;
    const ava = document.getElementById('chat-avatar');
    ava.src = obj.avatar ? serverUrl + obj.avatar : 'https://placehold.co/50';
    
    // Clear deleted status
    const oldIcon = ava.parentNode.querySelector('.header-deleted-icon'); if(oldIcon) oldIcon.remove();
    if(obj.is_deleted) { const icon = document.createElement('div'); icon.className = 'header-deleted-icon'; icon.innerHTML = '<i class="fas fa-skull"></i>'; ava.parentNode.appendChild(icon); }
    
    if(type === 'user') document.getElementById('enc-status').style.display = obj.public_key ? 'block' : 'none';
    else document.getElementById('enc-status').style.display = 'none';
    document.getElementById('chat-status').textContent = '';
    
    renderSidebar(); 
    
    const params = type === 'group' ? { groupId: obj.id } : { userId: currentUser.id, partnerId: obj.id };
    socket.emit('get_history', params);
    
    window.clearFileSelection();
    cancelEdit();
}

window.closeChat = (e) => { 
    if(e) e.stopPropagation(); 
    currentChat = null; 
    document.getElementById('chat-interface').style.display = 'none'; 
    document.getElementById('chat-placeholder').style.display = 'flex'; 
    renderSidebar(); 
};

// ==========================================
// RENDER MESSAGE (WITH DECRYPTION)
// ==========================================
async function renderMessage(msg) {
    let contentToShow = msg.content;
    const isEncrypted = (msg.is_encrypted === 1 || msg.is_encrypted === true);

    // Try Decrypt TEXT
    if (isEncrypted && currentChat.type === 'user') { 
        const secret = getSharedSecret(currentChat.public_key); 
        const decrypted = decryptText(msg.content, secret);
        if (decrypted) contentToShow = decrypted;
    }
    else if (isEncrypted) { 
        contentToShow = "🔒 Сообщение зашифровано"; 
    }

    let statusIcon = '<i class="far fa-clock status-icon"></i>';
    const readBy = typeof msg.read_by === 'string' ? JSON.parse(msg.read_by) : (msg.read_by || []);
    if (readBy.length > 1) statusIcon = '<i class="fas fa-check-double status-icon read"></i>';
    else if (msg.id) statusIcon = '<i class="fas fa-check status-icon"></i>';

    const isMe = msg.sender_id === currentUser.id;
    const container = document.getElementById('messages-container');
    const lastRow = container.lastElementChild;
    let isConsecutive = false;
    if (lastRow && lastRow.dataset.senderId == msg.sender_id) isConsecutive = true;

    const row = document.createElement('div'); 
    row.className = `msg-row ${isMe ? 'sent' : 'received'} ${isConsecutive ? 'consecutive' : ''}`;
    row.dataset.senderId = msg.sender_id;

    if (!isMe) {
        const img = document.createElement('img'); img.className = 'msg-avatar';
        img.src = msg.senderAvatar ? serverUrl + msg.senderAvatar : 'https://placehold.co/40';
        img.onclick = () => openUserProfile({ id: msg.sender_id, nickname: msg.senderName || 'User', avatar: msg.senderAvatar, username: '?' });
        row.appendChild(img);
    }

    const bubble = document.createElement('div'); 
    bubble.className = 'message'; 
    bubble.dataset.id = msg.id; 
    
    // ==========================================
    // FILE DECRYPTION LOGIC
    // ==========================================
    if(msg.type === 'image' || msg.type === 'file') {
        const currentChatId = currentChat.id;
        const placeholderId = `file-${msg.id}`;
        
        // Показываем прелоадер
        bubble.innerHTML = `<div id="${placeholderId}"><i class="fas fa-spinner fa-spin"></i> Загрузка...</div>`;
        
        // 1. Получаем ключ файла (он зашифрован в msg.content)
        let fileKeyHex = msg.content;
        
        // Если E2EE (ЛС), расшифровываем ключ файла
        if (currentChat.type === 'user' && isEncrypted) {
             const secret = getSharedSecret(currentChat.public_key);
             fileKeyHex = decryptText(msg.content, secret);
        }

        if(fileKeyHex && msg.file_iv) {
            (async () => {
                // Если юзер переключил чат, пока грузилось - отмена
                if(currentChat.id !== currentChatId) return;

                try {
                    const key = await importKey(fileKeyHex);
                    // Скачиваем зашифрованный BLOB
                    const response = await fetch(serverUrl + msg.file_url);
                    if(!response.ok) throw new Error("File fetch failed");
                    
                    const encryptedBlob = await response.blob();
                    // Расшифровываем в браузере
                    const decryptedBlob = await decryptFile(encryptedBlob, key, msg.file_iv);
                    const objectUrl = URL.createObjectURL(decryptedBlob);
                    
                    const el = document.getElementById(placeholderId);
                    if(el) {
                        if(msg.type === 'image') {
                            // Image with Lightbox click
                            el.innerHTML = `<img src="${objectUrl}" onclick="openMediaViewer('${objectUrl}')" style="cursor:pointer;">`;
                        } else {
                            // File Download Card
                            el.innerHTML = `
                                <div class="file-card-box">
                                    <div class="file-icon"><i class="fas fa-file"></i></div>
                                    <div class="file-info">
                                        <span class="file-name">${msg.file_name}</span>
                                        <span class="file-meta">${formatBytes(msg.file_size)}</span>
                                    </div>
                                    <a href="${objectUrl}" download="${msg.file_name}" class="file-download-btn"><i class="fas fa-download"></i></a>
                                </div>`;
                        }
                    }
                } catch(e) {
                    console.error("Decrypt error", e);
                    const el = document.getElementById(placeholderId);
                    if(el) el.innerHTML = `<span style="color:red"><i class="fas fa-exclamation-triangle"></i> Ошибка расшифровки</span>`;
                }
            })();
        } else {
             bubble.textContent = "Ключ шифрования не найден";
        }
    } else {
        // Обычный текст
        bubble.textContent = contentToShow; 
    }

    bubble.oncontextmenu = (e) => { 
        e.preventDefault(); 
        selectedMessageId = msg.id; 
        const menu = document.getElementById('context-menu'); 
        const readersBtn = document.getElementById('show-readers-btn'); 
        readersBtn.style.display = (currentChat.type === 'group') ? 'block' : 'none'; 
        
        let x = e.pageX; let y = e.pageY;
        if(x + 150 > window.innerWidth) x -= 160;
        if(y + 150 > window.innerHeight) y -= 160;
        
        menu.style.display = 'block'; 
        menu.style.left = x + 'px'; 
        menu.style.top = y + 'px'; 
    };

    if(msg.type === 'text') {
        const time = new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        bubble.innerHTML += `<div class="msg-meta">${time} ${isMe ? statusIcon : ''}</div><div class="reactions-container"></div>`;
    } else {
         // Для файлов добавляем мету отдельно (append)
         const time = new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
         const metaDiv = document.createElement('div');
         metaDiv.className = 'msg-meta';
         metaDiv.innerHTML = `${time} ${isMe ? statusIcon : ''}`;
         bubble.appendChild(metaDiv);
         
         const reacDiv = document.createElement('div');
         reacDiv.className = 'reactions-container';
         bubble.appendChild(reacDiv);
    }
    
    const reactions = typeof msg.reactions === 'string' ? JSON.parse(msg.reactions) : (msg.reactions || {});
    renderReactions(bubble, reactions);

    row.appendChild(bubble);
    container.appendChild(row);
    scrollToBottom();
}

// MEDIA VIEWER (LIGHTBOX)
window.openMediaViewer = (url) => {
    const modal = document.getElementById('media-viewer-modal');
    const img = document.getElementById('media-viewer-img');
    const btn = document.getElementById('media-download-btn');
    
    img.src = url;
    img.style.display = 'block';
    btn.href = url;
    
    modal.style.display = 'flex';
};

window.closeMediaViewer = () => {
    document.getElementById('media-viewer-modal').style.display = 'none';
    document.getElementById('media-viewer-img').src = '';
};

// HELPERS
function renderReactions(msgElement, reactions) {
    const container = msgElement.querySelector('.reactions-container'); 
    if(!container) return;
    container.innerHTML = '';
    for (const [emoji, userIds] of Object.entries(reactions)) {
        const tag = document.createElement('div'); tag.className = 'reaction-tag';
        if (userIds.includes(currentUser.id)) tag.classList.add('active');
        tag.innerHTML = `${emoji} ${userIds.length}`;
        tag.onclick = () => sendReaction(emoji);
        tag.title = "Users: " + userIds.join(', ');
        container.appendChild(tag);
    }
}

window.sendReaction = (emoji) => {
    const msgId = selectedMessageId; if(!msgId) return;
    document.getElementById('context-menu').style.display = 'none';
    socket.emit('add_reaction', { messageId: msgId, emoji, userId: currentUser.id, groupId: currentChat.type === 'group' ? currentChat.id : null, receiverId: currentChat.type === 'user' ? currentChat.id : null });
};
window.showReaders = () => { document.getElementById('context-menu').style.display = 'none'; socket.emit('get_message_readers', selectedMessageId); };
window.openUserProfile = (user) => {
    document.getElementById('view-profile-avatar').src = user.avatar ? serverUrl + user.avatar : 'https://placehold.co/100';
    document.getElementById('view-profile-nickname').textContent = user.nickname;
    document.getElementById('btn-write-msg').onclick = () => {
        closeModal('view-profile-modal');
        openChat({ id: user.id, name: user.nickname, avatar: user.avatar, type: 'user' }, 'user');
    };
    document.getElementById('view-profile-modal').style.display = 'flex';
};

window.copyUsername = () => { const fullId = "@" + currentUser.username; navigator.clipboard.writeText(fullId).then(() => { showToast("Ваш ID скопирован в буфер обмена"); }).catch(err => { console.error('Ошибка копирования: ', err); }); };
function showToast(message) { const oldToast = document.querySelector('.discord-toast'); if (oldToast) oldToast.remove(); const toast = document.createElement('div'); toast.className = 'discord-toast'; toast.textContent = message; document.body.appendChild(toast); void toast.offsetWidth; toast.classList.add('show'); setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 2000); }
function scrollToBottom() { const c = document.getElementById('messages-container'); c.scrollTop = c.scrollHeight; }
document.onclick = () => document.getElementById('context-menu').style.display = 'none';
window.initEditMessage = () => { const el = document.querySelector(`.message[data-id="${selectedMessageId}"]`); if(!el) return; editingMessageId = selectedMessageId; document.getElementById('message-input').value = el.dataset.content; document.getElementById('edit-mode-bar').style.display = 'flex'; document.getElementById('message-input').focus(); };
window.cancelEdit = () => { editingMessageId = null; document.getElementById('message-input').value = ''; document.getElementById('edit-mode-bar').style.display = 'none'; };
window.initDeleteMessage = () => { document.getElementById('delete-modal').style.display = 'flex'; };
window.confirmDelete = (mode) => { socket.emit('delete_message', { messageId: selectedMessageId, mode: mode, groupId: currentChat.type === 'group' ? currentChat.id : null, receiverId: currentChat.type === 'user' ? currentChat.id : null, userId: currentUser.id }); closeModal('delete-modal'); };
window.handleInputKey = (e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

// SEND MESSAGE FUNCTION
window.sendMessage = async () => {
    const input = document.getElementById('message-input'); 
    const txt = input.value.trim(); 
    const fileInput = document.getElementById('file-input');
    
    if(editingMessageId) { 
        if(txt) { socket.emit('edit_message', { messageId: editingMessageId, newContent: txt, groupId: currentChat.type === 'group' ? currentChat.id : null, receiverId: currentChat.type === 'user' ? currentChat.id : null }); cancelEdit(); } 
        return; 
    }
    
    if(!txt && !fileInput.files.length) return;
    
    // --- TEXT HANDLING ---
    let encryptedText = txt; 
    let isEncrypted = false;
    
    if (currentChat.type === 'user' && txt) { 
        const secret = getSharedSecret(currentChat.public_key); 
        if (secret) { 
            encryptedText = encryptText(txt, secret); 
            isEncrypted = true; 
        } 
    }

    // --- FILE HANDLING ---
    if(fileInput.files.length) {
        const file = fileInput.files[0];
        
        // 1. Generate One-Time Key for file
        const key = await generateFileKey();
        
        // 2. Encrypt File locally
        const { encryptedBlob, iv } = await encryptFile(file, key);
        
        // 3. Upload Encrypted Blob to DB
        const fd = new FormData();
        fd.append('file', encryptedBlob, file.name + ".enc"); 
        
        try {
            const res = await fetch(`${serverUrl}/api/upload_secure`, { method:'POST', body:fd });
            const fileData = await res.json(); // returns fileId, size
            
            // 4. Encrypt the File Key (Key Exchange)
            const rawFileKey = await exportKey(key);
            let encryptedFileKey = rawFileKey; 
            
            // Encrypt key with shared secret for DM
            if(currentChat.type === 'user') {
                const secret = getSharedSecret(currentChat.public_key);
                if(secret) encryptedFileKey = encryptText(rawFileKey, secret);
            }
            
            // 5. Send message with Link + IV + Encrypted Key
            const groupId = currentChat.type === 'group' ? currentChat.id : null;
            
            socket.emit('send_message', { 
                senderId: currentUser.id, 
                receiverId: currentChat.type === 'user' ? currentChat.id : null, 
                groupId: groupId, 
                content: encryptedFileKey, // Store KEY in content field
                type: fileInput.files[0].type.startsWith('image/') ? 'image' : 'file', 
                fileId: fileData.fileId,
                fileUrl: `/api/file/${fileData.fileId}`, 
                fileName: file.name, 
                fileSize: fileData.size, 
                fileIv: iv,
                isEncrypted: isEncrypted, 
                senderName: currentUser.nickname 
            });
            
            window.clearFileSelection();
        } catch(e) { console.error("Upload fail:", e); }
    }

    // Send text if present
    if(txt) { 
        const groupId = currentChat.type === 'group' ? currentChat.id : null;
        socket.emit('send_message', { 
            senderId: currentUser.id, 
            receiverId: currentChat.type === 'user' ? currentChat.id : null, 
            groupId: groupId, 
            content: encryptedText, 
            type: 'text', 
            isEncrypted: isEncrypted, 
            senderName: currentUser.nickname 
        }); 
        input.value = ''; 
    }
    
    document.getElementById('emoji-picker').style.display = 'none'; 
    document.getElementById('emoji-suggestions').style.display = 'none';
};

// ==========================================
// CALL LOGIC (FIXED)
// ==========================================

window.toggleDeviceMenu = (menuId) => {
    const menu = document.getElementById(menuId);
    const isShown = menu.classList.contains('show');
    document.querySelectorAll('.device-menu').forEach(m => m.classList.remove('show'));
    if (!isShown) {
        menu.classList.add('show');
        navigator.mediaDevices.enumerateDevices().then(devices => {
            menu.innerHTML = '';
            const type = menuId === 'video-menu' ? 'videoinput' : 'audioinput';
            devices.filter(d => d.kind === type).forEach(d => {
                const div = document.createElement('div');
                div.className = 'device-option';
                if(type === 'videoinput' && currentVideoDevice === d.deviceId) div.classList.add('selected');
                if(type === 'audioinput' && currentAudioDevice === d.deviceId) div.classList.add('selected');
                div.textContent = d.label || `${type} ${menu.children.length + 1}`;
                div.onclick = () => { changeDevice(type, d.deviceId); menu.classList.remove('show'); };
                menu.appendChild(div);
            });
        });
    }
};

function attachAndPlayVideo(el, stream, forceMute = false) {
    if (!el) return;
    el.srcObject = stream;
    el.playsInline = true;
    el.autoplay = true;
    if (forceMute) el.muted = true;

    const p = el.play();
    if (p && typeof p.catch === 'function') {
        p.catch(() => console.warn('Video play() blocked by autoplay policy'));
    }
}

async function primeCallAudio() {
    // Максимально ранний "unlock" аудио в момент клика (важно для Chrome/Edge + инкогнито)
    try {
        if (!remoteAudioEl) {
            remoteAudioEl = document.createElement('audio');
            remoteAudioEl.id = 'remote-audio';
            remoteAudioEl.autoplay = true;
            remoteAudioEl.playsInline = true;
            remoteAudioEl.controls = false;
            remoteAudioEl.style.display = 'none';
            document.body.appendChild(remoteAudioEl);
        }
        // тихий приминг
        remoteAudioEl.muted = true;
        remoteAudioEl.volume = 0;
        remoteAudioEl.srcObject = null;
        remoteAudioEl.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA='; // 1-2мс тишины
        const p = remoteAudioEl.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch {}

    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        if (!callAudioCtx || callAudioCtx.state === 'closed') callAudioCtx = new AC();
        // Разлочить вывод через очень тихий осциллятор
        const o = callAudioCtx.createOscillator();
        const g = callAudioCtx.createGain();
        g.gain.value = 0.00001;
        o.connect(g);
        g.connect(callAudioCtx.destination);
        o.start();
        o.stop(callAudioCtx.currentTime + 0.02);
        if (callAudioCtx.state === 'suspended') callAudioCtx.resume().catch(() => {});
    } catch {}
}

async function ensureCallAudioUnlocked() {
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        if (!callAudioCtx || callAudioCtx.state === 'closed') callAudioCtx = new AC();
        if (callAudioCtx.state === 'suspended') try { await callAudioCtx.resume(); } catch(_) {}
        return callAudioCtx.state === 'running';
    } catch (e) {
        console.warn('[CALL] AudioContext init failed', e);
        return false;
    }
}



// ==========================================
// CALL AUDIO DEBUG / METER
// ==========================================
let remoteMeterTimer = null;
let remoteMeterAnalyser = null;
let remoteMeterSource = null;
let debugBeepPlayed = false;

// Local meter (проверяет, действительно ли микрофон даёт сигнал, а не тишину)
let localMeterTimer = null;
let localMeterAnalyser = null;
let localMeterSource = null;

function stopLocalAudioMeter() {
    try { if (localMeterTimer) { clearInterval(localMeterTimer); localMeterTimer = null; } } catch {}
    try { if (localMeterSource) { localMeterSource.disconnect(); localMeterSource = null; } } catch {}
    try { if (localMeterAnalyser) { localMeterAnalyser.disconnect(); localMeterAnalyser = null; } } catch {}
}

function startLocalAudioMeter(stream, tag) {
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        if (!callAudioCtx || callAudioCtx.state === 'closed') callAudioCtx = new AC();
        if (callAudioCtx.state === 'suspended') callAudioCtx.resume().catch(() => {});
        // можно мерить даже когда suspended — но тогда просто выйдем
        if (callAudioCtx.state !== 'running') return;

        stopLocalAudioMeter();

        localMeterSource = callAudioCtx.createMediaStreamSource(stream);
        localMeterAnalyser = callAudioCtx.createAnalyser();
        localMeterAnalyser.fftSize = 2048;
        localMeterSource.connect(localMeterAnalyser);

        const data = new Uint8Array(localMeterAnalyser.fftSize);
        localMeterTimer = setInterval(() => {
            try {
                localMeterAnalyser.getByteTimeDomainData(data);
                let sum = 0;
                for (let i = 0; i < data.length; i++) {
                    const v = (data[i] - 128) / 128;
                    sum += v * v;
                }
                const rms = Math.sqrt(sum / data.length);
                console.log('[CALL] local rms ' + (tag || '') + ':', rms.toFixed(4));
            } catch {}
        }, 800);
    } catch (e) {
        console.warn('[CALL] local meter failed', e);
    }
}

function stopRemoteAudioMeter() {
    try { if (remoteMeterTimer) { clearInterval(remoteMeterTimer); remoteMeterTimer = null; } } catch {}
    try { if (remoteMeterSource) { remoteMeterSource.disconnect(); remoteMeterSource = null; } } catch {}
    try { if (remoteMeterAnalyser) { remoteMeterAnalyser.disconnect(); remoteMeterAnalyser = null; } } catch {}
}

function startRemoteAudioMeter(stream) {
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        if (!callAudioCtx || callAudioCtx.state === 'closed') callAudioCtx = new AC();
        if (callAudioCtx.state === 'suspended') callAudioCtx.resume().catch(() => {});
        if (callAudioCtx.state !== 'running') return;

        stopRemoteAudioMeter();

        remoteMeterSource = callAudioCtx.createMediaStreamSource(stream);
        remoteMeterAnalyser = callAudioCtx.createAnalyser();
        remoteMeterAnalyser.fftSize = 2048;
        remoteMeterSource.connect(remoteMeterAnalyser);

        const data = new Uint8Array(remoteMeterAnalyser.fftSize);

        remoteMeterTimer = setInterval(() => {
            try {
                remoteMeterAnalyser.getByteTimeDomainData(data);
                // RMS from 0..1
                let sum = 0;
                for (let i = 0; i < data.length; i++) {
                    const v = (data[i] - 128) / 128;
                    sum += v * v;
                }
                const rms = Math.sqrt(sum / data.length);
                // логируем редко, чтобы консоль не спамилась
                console.log('[CALL] remote rms', rms.toFixed(4));
            } catch {}
        }, 800);
    } catch (e) {
        console.warn('[CALL] meter failed', e);
    }
}

function playDebugBeep() {
    // Если beep не слышно — значит проблема вообще в выводе звука (site muted / mixer / output device)
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        if (!callAudioCtx || callAudioCtx.state === 'closed') callAudioCtx = new AC();
        if (callAudioCtx.state === 'suspended') callAudioCtx.resume().catch(() => {});
        if (callAudioCtx.state !== 'running') return;

        const o = callAudioCtx.createOscillator();
        const g = callAudioCtx.createGain();
        g.gain.value = 0.15;
        o.frequency.value = 440;
        o.connect(g);
        g.connect(callAudioCtx.destination);
        o.start();
        o.stop(callAudioCtx.currentTime + 0.12);
    } catch (e) {
        console.warn('[CALL] beep failed', e);
    }
}
function attachRemoteAudio(stream) {
    if (!stream) return;

    try { stream.getAudioTracks().forEach(t => t.enabled = true); } catch {}

    // Главный вывод — через <audio>, после priming это работает стабильнее всего (и даёт иконку звука на вкладке)
    try {
        if (!remoteAudioEl) {
            remoteAudioEl = document.createElement('audio');
            remoteAudioEl.id = 'remote-audio';
            remoteAudioEl.autoplay = true;
            remoteAudioEl.playsInline = true;
            remoteAudioEl.controls = false;
            remoteAudioEl.style.display = 'none';
            document.body.appendChild(remoteAudioEl);
        }
        remoteAudioEl.src = '';
        remoteAudioEl.srcObject = stream;
        remoteAudioEl.muted = false;
        remoteAudioEl.volume = 1;

        const p = remoteAudioEl.play();
        if (p && typeof p.catch === 'function') p.catch(() => console.warn('[CALL] audio.play blocked'));

        // Метр громкости (если rms ~ 0.0000 даже когда говоришь — микрофон на другой стороне реально не даёт сигнал)
        try { startRemoteAudioMeter(stream); } catch {}

        // Одноразовый тестовый beep: если его НЕ слышно, значит проблема вообще в выводе звука/сайте/микшере
        try {
            if (!debugBeepPlayed) { debugBeepPlayed = true; playDebugBeep(); }
        } catch {}

    } catch (e) {
        console.warn('[CALL] audio element attach failed', e);
    }

    // Дополнительно (fallback) — WebAudio, если вдруг элемент блокируется
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
            if (!callAudioCtx || callAudioCtx.state === 'closed') callAudioCtx = new AC();
            if (callAudioCtx.state === 'suspended') callAudioCtx.resume().catch(() => {});
            if (callAudioCtx.state === 'running') {
                if (remoteAudioNode) { try { remoteAudioNode.disconnect(); } catch {} remoteAudioNode = null; }
                const src = callAudioCtx.createMediaStreamSource(stream);
                src.connect(callAudioCtx.destination);
                remoteAudioNode = src;
            }
        }
    } catch (e) {
        console.warn('[CALL] WebAudio attach failed', e);
    }

    try {
        console.log('[CALL] audio status', {
            audioTracks: (stream.getAudioTracks() || []).length,
            track0: (() => {
                try {
                    const t = (stream.getAudioTracks() || [])[0];
                    if (!t) return null;
                    return { enabled: t.enabled, muted: t.muted, readyState: t.readyState, id: t.id };
                } catch { return null; }
            })(),
            elPaused: remoteAudioEl ? remoteAudioEl.paused : null,
            elMuted: remoteAudioEl ? remoteAudioEl.muted : null,
            elVolume: remoteAudioEl ? remoteAudioEl.volume : null,
            ctxState: callAudioCtx ? callAudioCtx.state : null
        });
    } catch {}
}


window.startCall = async (e) => {
    if (e) e.stopPropagation();
    if (!currentChat || currentChat.type === 'group') return alert("Звонки только тет-а-тет");
    if (!socket) return alert("Нет соединения с сервером");

    // ВАЖНО: разлочить звук в момент клика, до любых await
    primeCallAudio();


    document.getElementById('remote-avatar-call').src = currentChat.avatar ? serverUrl + currentChat.avatar : 'https://placehold.co/150';
    document.getElementById('remote-name-call').textContent = "Connecting to " + (currentChat.nickname || 'user') + "...";
    document.getElementById('call-placeholder').style.display = 'flex';
    document.getElementById('active-call-modal').style.display = 'flex';

    try {
        callPartnerId = currentChat ? currentChat.id : null;
        await ensureCallAudioUnlocked();
        localStream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
        try { startLocalAudioMeter(localStream, "(caller)"); } catch {}
        try {
            const t = localStream.getAudioTracks()[0];
            if (t) { t.enabled = true; }
            console.log('[CALL] local audio track (caller)', t ? { enabled: t.enabled, muted: t.muted, readyState: t.readyState, label: t.label } : null);
        } catch {}


        const localVideo = document.getElementById('local-video');
        const localWrapper = document.getElementById('local-video-wrapper');
        if (localWrapper) localWrapper.style.display = 'none';
        attachAndPlayVideo(localVideo, localStream, true);

        currentPeer = new SimplePeer({
            initiator: true,
            trickle: true,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });

        // Explicitly add tracks (avoids cases where simple-peer/addStream results in silent audio)
        try {
            if (localStream && currentPeer && typeof currentPeer.addTrack === 'function') {
                localStream.getTracks().forEach(function(tr) {
                    try { currentPeer.addTrack(tr, localStream); } catch (_) {}
                });
            }
        } catch (e) { console.warn('[CALL] addTrack failed', e); }

        currentPeer.on('signal', (signal) => {
            socket.emit('call_user', {
                userToCall: currentChat.id,
                from: currentUser.id,
                name: currentUser.nickname,
                signal
            });
        });

        currentPeer.on('stream', (remoteStream) => {
            console.log('[CALL] remote stream');
            try { attachRemoteAudio(remoteStream); } catch {}
            const remoteVideo = document.getElementById('remote-video');
            remoteVideo.muted = true; remoteVideo.volume = 0;
            const useWebAudio = !!(callAudioCtx && callAudioCtx.state === 'running');
            if (remoteVideo) {
                remoteVideo.muted = useWebAudio; // чтобы не было двойного звука
                remoteVideo.volume = 1;
            }
            attachAndPlayVideo(remoteVideo, remoteStream, useWebAudio);
            document.getElementById('call-placeholder').style.display = 'none';
        });
currentPeer.on('connect', () => {
            console.log('[CALL] peer connect (caller)');
            document.getElementById('call-placeholder').style.display = 'none';
        });

        currentPeer.on('error', (err) => console.error('[CALL] peer error (caller)', err));
        currentPeer.on('close', () => console.log('[CALL] peer close (caller)'));

    } catch (err) {
        console.error(err);
        alert('Нет доступа к микрофону/аудио: ' + err);
        endCall();
    }
};


window.acceptCall = async () => {
    // ВАЖНО: разлочить звук в момент клика, до любых await
    primeCallAudio();
    document.getElementById('incoming-call-modal').style.display = 'none';
    document.getElementById('active-call-modal').style.display = 'flex';
    document.getElementById('call-placeholder').style.display = 'flex';

    if (!incomingCallData) return;

    try {
        callPartnerId = incomingCallData ? incomingCallData.from : null;
        await ensureCallAudioUnlocked();
        localStream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
        try { startLocalAudioMeter(localStream, "(callee)"); } catch {}
        try {
            const t = localStream.getAudioTracks()[0];
            if (t) { t.enabled = true; }
            console.log('[CALL] local audio track (callee)', t ? { enabled: t.enabled, muted: t.muted, readyState: t.readyState, label: t.label } : null);
        } catch {}


        const localVideo = document.getElementById('local-video');
        const localWrapper = document.getElementById('local-video-wrapper');
        if (localWrapper) localWrapper.style.display = 'none';
        attachAndPlayVideo(localVideo, localStream, true);

        currentPeer = new SimplePeer({
            initiator: false,
            trickle: true,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });

        // Explicitly add tracks (avoids cases where simple-peer/addStream results in silent audio)
        try {
            if (localStream && currentPeer && typeof currentPeer.addTrack === 'function') {
                localStream.getTracks().forEach(function(tr) {
                    try { currentPeer.addTrack(tr, localStream); } catch (_) {}
                });
            }
        } catch (e) { console.warn('[CALL] addTrack failed', e); }

        currentPeer.on('signal', (signal) => {
            socket.emit('answer_call', {
                to: incomingCallData.from,
                signal
            });
        });

        currentPeer.on('stream', (remoteStream) => {
            console.log('[CALL] remote stream');
            try { attachRemoteAudio(remoteStream); } catch {}
            const remoteVideo = document.getElementById('remote-video');
            remoteVideo.muted = true; remoteVideo.volume = 0;
            const useWebAudio = !!(callAudioCtx && callAudioCtx.state === 'running');
            if (remoteVideo) {
                remoteVideo.muted = useWebAudio; // чтобы не было двойного звука
                remoteVideo.volume = 1;
            }
            attachAndPlayVideo(remoteVideo, remoteStream, useWebAudio);
            document.getElementById('call-placeholder').style.display = 'none';
        });
currentPeer.on('connect', () => {
            console.log('[CALL] peer connect (callee)');
            document.getElementById('call-placeholder').style.display = 'none';
        });

        currentPeer.on('error', (err) => console.error('[CALL] peer error (callee)', err));
        currentPeer.on('close', () => console.log('[CALL] peer close (callee)'));

        // Прокидываем все сигналы, которые успели прийти до нажатия "Принять"
        const signals = Array.isArray(incomingSignalQueue) ? incomingSignalQueue.slice() : [];
        const first = incomingCallData.signal || incomingCallData.signalData;
        if (first) {
            const hasOffer = signals.some(s => s && s.type === 'offer');
            if (!hasOffer) signals.unshift(first);
        }
for (const s of signals) {
            if (!s) continue;
            try { currentPeer.signal(s); } catch (e) { console.warn(e); }
        incomingSignalQueue = [];
        }

    } catch (err) {
        console.error(err);
        alert('Ошибка доступа к микрофону/аудио: ' + err);
        endCall();
    }
};


window.declineCall = () => { 
    document.getElementById('incoming-call-modal').style.display = 'none'; 
    socket.emit('end_call', { to: incomingCallData.from }); 
    incomingCallData = null; 
};

function setupCallUI() { 
    document.getElementById('active-call-modal').style.display = 'flex'; 
}

window.changeDevice = async (kind, deviceId) => {
    if (kind === 'audioinput') currentAudioDevice = deviceId;
    else currentVideoDevice = deviceId;

    try {
        const constraints = {
            audio: currentAudioDevice ? { deviceId: { exact: currentAudioDevice } } : true,
            video: currentVideoDevice ? { deviceId: { exact: currentVideoDevice } } : false
        };
        if(isScreenSharing) { constraints.video = false; } 

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if(currentPeer && !currentPeer.destroyed) {
            const senders = currentPeer._pc.getSenders();
            newStream.getTracks().forEach(track => {
                const sender = senders.find(s => s.track.kind === track.kind);
                if(sender) sender.replaceTrack(track);
            });
        }

        if(!isScreenSharing) {
            localStream = newStream;
            document.getElementById('local-video').srcObject = newStream;
        } else {
            const audioTrack = newStream.getAudioTracks()[0];
            if(audioTrack) {
                const oldAudio = localStream.getAudioTracks()[0];
                if(oldAudio) localStream.removeTrack(oldAudio);
                localStream.addTrack(audioTrack);
            }
        }
        
    } catch(e) { console.error(e); }
};

window.toggleMic = () => { 
    if(!localStream) return; 
    const track = localStream.getAudioTracks()[0]; 
    if(track) { 
        track.enabled = !track.enabled; 
        document.getElementById('btn-mic').classList.toggle('active', track.enabled); 
        document.getElementById('btn-mic').innerHTML = track.enabled ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
    } 
};

window.toggleCam = async () => { 
    if(isScreenSharing) { alert("Сначала выключите демонстрацию экрана"); return; }
    
    const wrapper = document.getElementById('local-video-wrapper');

    if(!localStream.getVideoTracks().length) {
        const vidStream = await navigator.mediaDevices.getUserMedia({ video: currentVideoDevice ? { deviceId: { exact: currentVideoDevice } } : true });
        const vidTrack = vidStream.getVideoTracks()[0];
        localStream.addTrack(vidTrack);
        if(currentPeer && !currentPeer.destroyed) currentPeer.addTrack(vidTrack, localStream);
        
        document.getElementById('local-video').srcObject = localStream;
        document.getElementById('btn-cam').classList.add('active');
        document.getElementById('btn-cam').innerHTML = '<i class="fas fa-video"></i>';
        wrapper.style.display = 'block'; 
    } else {
        const track = localStream.getVideoTracks()[0];
        track.enabled = !track.enabled;
        
        if (track.enabled) {
            document.getElementById('btn-cam').classList.add('active');
            document.getElementById('btn-cam').innerHTML = '<i class="fas fa-video"></i>';
            wrapper.style.display = 'block';
        } else {
            document.getElementById('btn-cam').classList.remove('active');
            document.getElementById('btn-cam').innerHTML = '<i class="fas fa-video-slash"></i>';
            wrapper.style.display = 'none';
        }
    }
};

window.startScreenShare = () => { document.getElementById('screen-share-modal').style.display = 'flex'; };

window.confirmScreenShare = async (withAudio) => {
    closeModal('screen-share-modal');
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: withAudio });
        isScreenSharing = true;
        
        const screenTrack = stream.getVideoTracks()[0];
        if(currentPeer && !currentPeer.destroyed) {
            const senders = currentPeer._pc.getSenders();
            const sender = senders.find(s => s.track.kind === 'video');
            if(sender) sender.replaceTrack(screenTrack);
            else currentPeer.addTrack(screenTrack, localStream); 
        }
        
        document.getElementById('local-video').srcObject = stream;
        document.getElementById('local-video-wrapper').style.display = 'block'; 
        
        screenTrack.onended = () => {
            isScreenSharing = false;
            alert("Демонстрация завершена");
            document.getElementById('local-video-wrapper').style.display = 'none';
        };
        
    } catch(e) { console.error(e); }
};

window.endCallUI = () => {
    // фиксируем, с кем был звонок (для фильтрации поздних ICE)
    lastCallEndedAt = Date.now();
    lastCallPartnerId = callPartnerId;
    callPartnerId = null;

    // WebRTC cleanup
    if (currentPeer) { try { currentPeer.destroy(); } catch {} currentPeer = null; }
    if (localStream) { try { localStream.getTracks().forEach(t => t.stop()); } catch {} localStream = null; }

    // Audio cleanup
    if (remoteAudioNode) { try { remoteAudioNode.disconnect(); } catch {} remoteAudioNode = null; }
    try { stopRemoteAudioMeter(); } catch {}
    try { stopLocalAudioMeter(); } catch {}
    debugBeepPlayed = false;
    // не закрываем AudioContext, чтобы не словить автоплей-блок на следующем звонке
    if (callAudioCtx) { try { if (callAudioCtx.state === 'running') callAudioCtx.suspend().catch(() => {}); } catch {} }
    if (remoteAudioEl) { try { remoteAudioEl.srcObject = null; remoteAudioEl.remove(); } catch {} remoteAudioEl = null; }

    // UI / media elements cleanup
    const remoteVideo = document.getElementById('remote-video');
    remoteVideo.muted = true; remoteVideo.volume = 0;
            const localVideo = document.getElementById('local-video');
    if (remoteVideo) { remoteVideo.srcObject = null; try { remoteVideo.load(); } catch {} }
    if (localVideo) { localVideo.srcObject = null; try { localVideo.load(); } catch {} }

    incomingCallData = null;
    incomingSignalQueue = [];
    isScreenSharing = false;

    const active = document.getElementById('active-call-modal');
    const incoming = document.getElementById('incoming-call-modal');
    if (active) active.style.display = 'none';
    if (incoming) incoming.style.display = 'none';
};


window.endCall = () => {
    const partnerId = callPartnerId || (currentChat ? currentChat.id : (incomingCallData ? incomingCallData.from : null));
    if (partnerId) socket.emit('end_call', { to: partnerId });
    endCallUI();
};