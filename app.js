let socket;
let currentUser = null;
let currentChat = null; 
let serverUrl = localStorage.getItem('serverUrl') || '';
let sidebarChats = []; 
let localStream = null;
let currentPeer = null;
let incomingCallData = null;
let editingMessageId = null;
let selectedMessageId = null;

const EC = elliptic.ec;
const ec = new EC('secp256k1');
let myKeyPair = null;
let sharedKeys = {};

const emojiData = {
    "Smileys": ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","😙","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🤧","🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐","😕","🙁","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖"],
    "Body": ["👋","🤚","🖐","✋","🖖","👌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","🦵","🦶","👂","🦻","👃","🧠","🦷","🦴","👀","👁","👅","👄","💋","🩸"],
    "Love": ["❤️","🧡","💛","💚","💙","💜","🤎","🖤","🤍","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","☮️","✝️","☪️","🕉","☸️","✡️","🔯","🕎","☯️","☦️","🛐","⛎","♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","🆔","⚛️"],
    "Objects": ["💣","🔪","🗡","⚔️","🛡","🚬","⚰️","⚱️","🏺","🔮","📿","🧿","💈","⚗️","🔭","🔬","🕳","🩹","🩺","💊","💉","🩸","🧬","🦠","🧫","🧪","🌡","🧹","🧺","🧻","🚽","🚰","🚿","🛁","🛀","🧼","🪒","🧽","🧴","🛎","🔑","🗝","🚪","🪑","🛋","🛏","🛌","🧸","🖼","🛍","🛒","🎁","🎈","🎏","🎀","🎊","🎉","🎎","🏮","🎐","🧧","✉️","📩","📨","📧","💌","📥","📤","📦","🏷","📪","📫","📬","📭","📮","📯","📜","📃","📄","📑","🧾","📊","📈","📉","🗒","🗓","📆","📅","🗑","📇","🗃","🗳","🗄","📋","📁","📂","🗂","🗞","📰","📓","📔","📒","📕","📗","📘","📙","📚","📖","🔖","🧷","🔗","📎","🖇","📐","📏","🧮","📌","📍","✂️","🖊","🖋","✒️","🖌","🖍","📝","✏️","🔍","🔎","🔏","🔐","🔒","🔓"],
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

document.addEventListener('DOMContentLoaded', () => {
    if(serverUrl) document.getElementById('server-url').value = serverUrl;
    const savedUser = localStorage.getItem('user');
    const savedKey = localStorage.getItem('priv_key_seed');
    
    if (serverUrl && savedUser && savedKey) {
        currentUser = JSON.parse(savedUser);
        initCrypto(savedKey);
        connectToServer();
    }
    initEmojiPicker();
});

// --- CRYPTO (E2EE) ---
function initCrypto(fileHashHex) {
    myKeyPair = ec.keyFromPrivate(fileHashHex);
}

function getSharedSecret(otherPubKeyHex) {
    if(!otherPubKeyHex) return null;
    if(sharedKeys[otherPubKeyHex]) return sharedKeys[otherPubKeyHex];
    try {
        const key = ec.keyFromPublic(otherPubKeyHex, 'hex');
        const shared = myKeyPair.derive(key.getPublic());
        const sharedHex = shared.toString(16).substring(0, 64);
        sharedKeys[otherPubKeyHex] = sharedHex;
        return sharedHex;
    } catch(e) { return null; }
}

function encryptText(text, secret) {
    if(!secret) return text; 
    return CryptoJS.AES.encrypt(text, secret).toString();
}

function decryptText(ciphertext, secret) {
    if(!secret) return ciphertext;
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, secret);
        const str = bytes.toString(CryptoJS.enc.Utf8);
        return str || ciphertext;
    } catch(e) { return "Ошибка расшифровки"; }
}

// --- UI HELPERS ---
window.switchTab = (tab) => {
    document.querySelectorAll('form').forEach(f => f.style.display = 'none');
    document.getElementById(tab === 'login' ? 'login-form' : 'register-form').style.display = 'block';
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
};
window.closeModal = (id) => document.getElementById(id).style.display = 'none';

window.handleFileSelect = (e) => {
    const file = e.target.files[0];
    const preview = document.getElementById('file-preview-area');
    const nameSpan = document.getElementById('preview-filename');
    if(file) {
        preview.style.display = 'flex';
        nameSpan.textContent = file.name;
    } else {
        preview.style.display = 'none';
    }
};
window.clearFileSelection = () => {
    document.getElementById('file-input').value = '';
    document.getElementById('file-preview-area').style.display = 'none';
};

// --- EMOJI ---
function initEmojiPicker() {
    const tabsContainer = document.getElementById('emoji-tabs');
    let first = true;
    for (const cat in emojiData) {
        const tab = document.createElement('div');
        tab.className = 'emoji-tab' + (first ? ' active' : '');
        tab.textContent = emojiData[cat][0];
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
window.filterEmojis = (val) => { if(!val) return switchEmojiTab("Smileys", document.querySelector('.emoji-tab')); };
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
    } else {
        sugg.style.display = 'none';
    }
};
window.addSuggestion = (em) => {
    const input = document.getElementById('message-input');
    input.value += em + " ";
    document.getElementById('emoji-suggestions').style.display = 'none';
    input.focus();
};

// --- AUTH WITH FILE ---
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
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

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

    } catch (e) { alert("Ошибка входа: " + e.message); }
};

window.logout = () => { 
    localStorage.clear(); // Полная очистка
    location.reload(); 
};

// --- PROFILE EDIT ---
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

// --- SOCKET & CHAT ---
function connectToServer() {
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('main-screen').classList.add('active');
    
    document.getElementById('my-avatar').src = currentUser.avatar ? serverUrl + currentUser.avatar : 'https://placehold.co/50';
    document.getElementById('my-name').textContent = currentUser.nickname;
    document.getElementById('my-username-small').textContent = '@' + currentUser.username;

    socket = io(serverUrl);
    socket.on('connect', () => socket.emit('authenticate', currentUser.id));
    socket.on('sidebar_update', (chats) => { sidebarChats = chats; renderSidebar(); });
    socket.on('search_results', (users) => renderSidebar(users, true));

    // --- КИЛЛ СВИТЧ (МОЛЧА) ---
    socket.on('force_logout', () => {
        window.logout();
    });

    socket.on('user_deleted_status', (data) => {
        if(currentChat && currentChat.id === data.id && currentChat.type === 'user') {
            document.getElementById('chat-status').textContent = 'Удален';
            const ava = document.getElementById('chat-avatar');
            if(ava.parentNode.querySelector('.header-deleted-icon')) return;
            ava.src = 'https://placehold.co/50?text=X';
            const icon = document.createElement('div');
            icon.className = 'header-deleted-icon';
            icon.innerHTML = '<i class="fas fa-skull"></i>';
            ava.parentNode.appendChild(icon);
        }
        socket.emit('authenticate', currentUser.id);
    });

    socket.on('user_revived', () => socket.emit('authenticate', currentUser.id));

    socket.on('new_message', (msg) => {
        if ((msg.group_id && currentChat?.type === 'group' && currentChat.id === msg.group_id) ||
            (!msg.group_id && currentChat?.type === 'user' && (msg.sender_id === currentChat.id || msg.sender_id === currentUser.id))) {
            renderMessage(msg);
        } else {
            socket.emit('authenticate', currentUser.id);
        }
    });

    socket.on('message_updated', (data) => {
        const els = document.querySelectorAll('.message');
        els.forEach(el => {
            if(el.dataset.id == data.id) {
                const p = el.querySelector('p');
                if(p) p.innerHTML = data.content.replace(/\n/g, '<br>') + ' <span class="msg-edited">(изм.)</span>';
            }
        });
    });

    socket.on('message_deleted', (data) => {
        const els = document.querySelectorAll('.message');
        els.forEach(el => { if(el.dataset.id == data.id) el.remove(); });
    });

    socket.on('history_loaded', (msgs) => {
        document.getElementById('messages-container').innerHTML = '';
        msgs.forEach(renderMessage);
        scrollToBottom();
    });

    socket.on('call_incoming', (data) => {
        if(currentPeer || incomingCallData) { socket.emit('call_busy'); return; }
        incomingCallData = data;
        document.getElementById('incoming-call-modal').style.display = 'flex';
        document.getElementById('caller-name').textContent = data.name;
    });
    socket.on('call_accepted', (signal) => { if(currentPeer) currentPeer.signal(signal); });
    socket.on('call_busy', () => { alert("Абонент занят"); endCallUI(); });
    socket.on('call_ended', () => { endCallUI(); });
    socket.on('all_users_list', (users) => {
        const list = document.getElementById('group-candidates-list');
        list.innerHTML = '';
        users.forEach(u => {
            if(u.id === currentUser.id) return;
            const div = document.createElement('div');
            div.className = 'check-item';
            div.innerHTML = `<input type="checkbox" id="user-${u.id}" value="${u.id}"><label for="user-${u.id}">${u.nickname}</label>`;
            list.appendChild(div);
        });
    });
}

function renderSidebar(list = null, isSearch = false) {
    const container = document.getElementById('chats-list');
    container.innerHTML = '';
    const data = list || sidebarChats;
    if(isSearch && data.length === 0) container.innerHTML = '<div style="padding:10px; color:#777;">Ничего не найдено</div>';
    data.forEach(item => {
        if(item.id === currentUser.id && item.type !== 'group') return;
        const el = document.createElement('div');
        el.className = 'chat-item';
        if(currentChat && currentChat.id === item.id && currentChat.type === (item.type || 'user')) el.classList.add('active');
        const avatar = item.avatar ? serverUrl + item.avatar : 'https://placehold.co/50';
        
        let deletedBadge = '';
        if(item.is_deleted) {
            deletedBadge = '<div class="deleted-overlay"><i class="fas fa-skull"></i></div>';
        }

        el.innerHTML = `<div style="position:relative"><img src="${avatar}">${deletedBadge}</div><div><div style="font-weight:bold">${item.nickname || item.name}</div><div style="font-size:12px; color:#aaa">${item.type === 'group' ? 'Группа' : ''}</div></div>`;
        el.onclick = () => openChat(item, isSearch ? 'user' : item.type);
        container.appendChild(el);
    });
}

window.handleSearchKey = (e) => {
    if(e.key === 'Enter') {
        const val = e.target.value;
        if(val) socket.emit('search_users', val);
        else socket.emit('authenticate', currentUser.id);
    }
};

function openChat(obj, type) {
    if(!type) type = obj.name ? 'group' : 'user';
    currentChat = { id: obj.id, type: type, ...obj };
    document.getElementById('chat-placeholder').style.display = 'none';
    document.getElementById('chat-interface').style.display = 'flex';
    document.getElementById('chat-name').textContent = obj.nickname || obj.name;
    const ava = document.getElementById('chat-avatar');
    ava.src = obj.avatar ? serverUrl + obj.avatar : 'https://placehold.co/50';
    
    const oldIcon = ava.parentNode.querySelector('.header-deleted-icon');
    if(oldIcon) oldIcon.remove();

    if(obj.is_deleted) {
        const icon = document.createElement('div');
        icon.className = 'header-deleted-icon';
        icon.innerHTML = '<i class="fas fa-skull"></i>';
        ava.parentNode.appendChild(icon);
    }
    
    if(type === 'user') document.getElementById('enc-status').style.display = obj.public_key ? 'block' : 'none';
    else document.getElementById('enc-status').style.display = 'none';

    renderSidebar(); 
    const params = type === 'group' ? { groupId: obj.id } : { userId: currentUser.id, partnerId: obj.id };
    socket.emit('get_history', params);
    window.clearFileSelection();
    cancelEdit();
}

window.closeChat = () => {
    currentChat = null;
    document.getElementById('chat-interface').style.display = 'none';
    document.getElementById('chat-placeholder').style.display = 'flex';
    renderSidebar();
};

function renderMessage(msg) {
    let contentToShow = msg.content;
    
    if (msg.is_encrypted && currentChat.type === 'user') {
        const secret = getSharedSecret(currentChat.public_key);
        contentToShow = decryptText(msg.content, secret);
    } else if (msg.is_encrypted) {
        contentToShow = "🔒 Сообщение зашифровано (Ключ недоступен)";
    }

    const div = document.createElement('div');
    const sender = msg.sender_id || msg.senderId;
    const isMe = sender === currentUser.id;
    div.className = `message ${isMe ? 'sent' : 'received'}`;
    div.dataset.id = msg.id;
    div.dataset.content = contentToShow;
    
    div.oncontextmenu = (e) => {
        e.preventDefault();
        selectedMessageId = msg.id;
        const menu = document.getElementById('context-menu');
        
        let canEdit = isMe && msg.type === 'text';
        let canDelete = false;

        if (isMe) canDelete = true;
        else {
            if (currentChat.type === 'user') canDelete = true; 
            else if (currentChat.type === 'group' && currentChat.creator_id === currentUser.id) canDelete = true; 
        }

        const editBtn = menu.querySelector('div:first-child');
        editBtn.style.display = canEdit ? 'block' : 'none';
        
        const delBtn = menu.querySelector('div:last-child');
        delBtn.style.display = canDelete ? 'block' : 'none';

        if(editBtn.style.display === 'none' && delBtn.style.display === 'none') return;

        menu.style.display = 'block';
        menu.style.left = e.pageX + 'px';
        menu.style.top = e.pageY + 'px';
    };

    let html = '';
    if (msg.group_id && !isMe) html += `<span class="msg-name">${msg.senderName || 'User'}</span>`;
    
    if(msg.type === 'text') {
        html += `<p>${contentToShow.replace(/\n/g, '<br>')}${msg.is_edited ? ' <span class="msg-edited">(изм.)</span>' : ''}</p>`;
    } else if(msg.type === 'image') {
        html += `<img src="${serverUrl + msg.file_url}" onclick="window.open('${serverUrl + msg.file_url}')">`;
    } else {
        const fileName = msg.file_name || 'Файл';
        const fileSize = msg.file_size ? formatBytes(msg.file_size) : '';
        html += `
            <div class="file-card-box">
                <div class="file-icon"><i class="fas fa-file"></i></div>
                <div class="file-info">
                    <span class="file-name">${fileName}</span>
                    <span class="file-meta">${fileSize}</span>
                </div>
                <a href="${serverUrl + msg.file_url}" target="_blank" class="file-download-btn"><i class="fas fa-download"></i></a>
            </div>`;
    }
    div.innerHTML = html;
    document.getElementById('messages-container').appendChild(div);
    scrollToBottom();
}

function scrollToBottom() { const c = document.getElementById('messages-container'); c.scrollTop = c.scrollHeight; }

document.onclick = () => document.getElementById('context-menu').style.display = 'none';

window.initEditMessage = () => {
    const el = document.querySelector(`.message[data-id="${selectedMessageId}"]`);
    if(!el) return;
    editingMessageId = selectedMessageId;
    document.getElementById('message-input').value = el.dataset.content;
    document.getElementById('edit-mode-bar').style.display = 'flex';
    document.getElementById('message-input').focus();
};

window.cancelEdit = () => {
    editingMessageId = null;
    document.getElementById('message-input').value = '';
    document.getElementById('edit-mode-bar').style.display = 'none';
};

window.initDeleteMessage = () => { document.getElementById('delete-modal').style.display = 'flex'; };

window.confirmDelete = (mode) => {
    socket.emit('delete_message', { 
        messageId: selectedMessageId, 
        mode: mode, 
        groupId: currentChat.type === 'group' ? currentChat.id : null,
        receiverId: currentChat.type === 'user' ? currentChat.id : null,
        userId: currentUser.id
    });
    closeModal('delete-modal');
};

window.handleInputKey = (e) => {
    if(e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
};

window.sendMessage = async () => {
    const input = document.getElementById('message-input');
    const txt = input.value.trim();
    const fileInput = document.getElementById('file-input');
    
    if(editingMessageId) {
        if(txt) {
            socket.emit('edit_message', {
                messageId: editingMessageId,
                newContent: txt, // TODO: Encrypt
                groupId: currentChat.type === 'group' ? currentChat.id : null,
                receiverId: currentChat.type === 'user' ? currentChat.id : null
            });
            cancelEdit();
        }
        return;
    }

    if(!txt && !fileInput.files.length) return;
    
    let encryptedText = txt;
    let isEncrypted = false;

    // ENCRYPT (Only DM)
    if (currentChat.type === 'user' && txt) {
        const secret = getSharedSecret(currentChat.public_key);
        if (secret) {
            encryptedText = encryptText(txt, secret);
            isEncrypted = true;
        }
    }

    if(fileInput.files.length) {
        const fd = new FormData();
        fd.append('file', fileInput.files[0]);
        try {
            const res = await fetch(`${serverUrl}/api/upload`, { method:'POST', body:fd });
            const fileData = await res.json();
            const type = fileInput.files[0].type.startsWith('image/') ? 'image' : 'file';
            emitMsg(null, type, fileData.url, fileData.originalName, fileData.size, false);
            window.clearFileSelection();
        } catch(e) {}
    }

    if(txt) { 
        emitMsg(encryptedText, 'text', null, null, null, isEncrypted); 
        input.value = ''; 
    }
    document.getElementById('emoji-picker').style.display = 'none';
    document.getElementById('emoji-suggestions').style.display = 'none';
};

function emitMsg(content, type, url, fileName, fileSize, isEncrypted) {
    socket.emit('send_message', {
        senderId: currentUser.id,
        receiverId: currentChat.type === 'user' ? currentChat.id : null,
        groupId: currentChat.type === 'group' ? currentChat.id : null,
        content, type, fileUrl: url, fileName, fileSize, 
        isEncrypted: isEncrypted,
        senderName: currentUser.nickname
    });
}

// --- CALLS ---
window.startCall = () => {
    if(currentChat.type === 'group') return alert("Звонки только тет-а-тет");
    navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(stream => {
        setupCallUI(stream);
        currentPeer = new SimplePeer({ initiator: true, trickle: false, stream });
        currentPeer.on('signal', data => socket.emit('call_user', { userToCall: currentChat.id, signalData: data, from: currentUser.id, name: currentUser.nickname }));
        currentPeer.on('stream', rs => {
            const v = document.getElementById('remote-video');
            v.srcObject = rs;
            v.muted = false; 
        });
    }).catch(e => alert("Нет доступа к микрофону"));
};

window.acceptCall = () => {
    document.getElementById('incoming-call-modal').style.display = 'none';
    navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(stream => {
        setupCallUI(stream);
        currentPeer = new SimplePeer({ initiator: false, trickle: false, stream });
        currentPeer.on('signal', data => socket.emit('answer_call', { signal: data, to: incomingCallData.from }));
        currentPeer.on('stream', rs => {
            const v = document.getElementById('remote-video');
            v.srcObject = rs;
            v.muted = false; 
        });
        currentPeer.signal(incomingCallData.signal);
    }).catch(e => alert("Ошибка: " + e));
};

window.declineCall = () => {
    document.getElementById('incoming-call-modal').style.display = 'none';
    socket.emit('end_call', { to: incomingCallData.from });
    incomingCallData = null;
};

async function setupCallUI(stream) {
    localStream = stream;
    document.getElementById('active-call-modal').style.display = 'flex';
    document.getElementById('local-video').srcObject = stream;
    setTimeout(loadDevices, 500); 
}

async function loadDevices() {
    try {
        const devs = await navigator.mediaDevices.enumerateDevices();
        const aud = document.getElementById('audio-source');
        const vid = document.getElementById('video-source');
        aud.innerHTML = ''; vid.innerHTML = '';
        
        devs.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.deviceId;
            opt.text = d.label || (d.kind + ' ' + (d.kind === 'audioinput' ? aud.length : vid.length));
            if(d.kind === 'audioinput') aud.appendChild(opt);
            if(d.kind === 'videoinput') vid.appendChild(opt);
        });

        const savedAud = localStorage.getItem('pref_audio');
        const savedVid = localStorage.getItem('pref_video');
        if(savedAud) aud.value = savedAud;
        if(savedVid) vid.value = savedVid;

    } catch(e) { console.error(e); }
}

window.changeDevice = async () => {
    const audioId = document.getElementById('audio-source').value;
    const videoId = document.getElementById('video-source').value;
    localStorage.setItem('pref_audio', audioId);
    localStorage.setItem('pref_video', videoId);

    try {
        const newStream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: { exact: audioId } },
            video: { deviceId: { exact: videoId } }
        });

        if(currentPeer) {
            const videoTrack = newStream.getVideoTracks()[0];
            const audioTrack = newStream.getAudioTracks()[0];
            const oldVideo = localStream.getVideoTracks()[0];
            const oldAudio = localStream.getAudioTracks()[0];

            if(videoTrack && oldVideo) currentPeer.replaceTrack(oldVideo, videoTrack, localStream);
            if(audioTrack && oldAudio) currentPeer.replaceTrack(oldAudio, audioTrack, localStream);
        }

        localStream = newStream;
        document.getElementById('local-video').srcObject = newStream;
        
        const vt = newStream.getVideoTracks()[0];
        document.getElementById('btn-cam').classList.toggle('active', vt && vt.enabled);
        const at = newStream.getAudioTracks()[0];
        document.getElementById('btn-mic').classList.toggle('active', at && at.enabled);

    } catch(e) { console.error(e); }
};

window.toggleMic = () => {
    if(!localStream) return;
    const track = localStream.getAudioTracks()[0];
    if(track) {
        track.enabled = !track.enabled;
        document.getElementById('btn-mic').classList.toggle('active', track.enabled);
    }
};

window.toggleCam = () => {
    if(!localStream) return;
    const track = localStream.getVideoTracks()[0];
    if(!track) return alert("Камера не активна. Выберите в списке.");
    track.enabled = !track.enabled;
    document.getElementById('btn-cam').classList.toggle('active', track.enabled);
};

window.endCall = () => {
    const partnerId = currentChat ? currentChat.id : (incomingCallData ? incomingCallData.from : null);
    if(partnerId) socket.emit('end_call', { to: partnerId });
    if(currentPeer) currentPeer.destroy();
    if(localStream) localStream.getTracks().forEach(t => t.stop());
    currentPeer = null; localStream = null; incomingCallData = null;
    document.getElementById('active-call-modal').style.display = 'none';
    document.getElementById('incoming-call-modal').style.display = 'none';
};

window.openCreateGroupModal = () => { document.getElementById('create-group-modal').style.display = 'flex'; socket.emit('get_all_users_for_group'); };
window.createGroup = () => {
    const name = document.getElementById('new-group-name').value;
    const checks = document.querySelectorAll('#group-candidates-list input:checked');
    if(!name || checks.length === 0) return alert("Введите имя и выберите участников");
    const memberIds = Array.from(checks).map(c => parseInt(c.value));
    socket.emit('create_group', { name, memberIds, creatorId: currentUser.id });
    closeModal('create-group-modal');
};
window.openProfileSettings = () => {
    document.getElementById('profile-modal').style.display = 'flex';
    document.getElementById('edit-nickname').value = currentUser.nickname;
    document.getElementById('profile-big-username').textContent = '@' + currentUser.username;
    // ВАЖНО: Добавляем serverUrl, чтобы картинка загрузилась
    const avatarSrc = currentUser.avatar ? serverUrl + currentUser.avatar : 'https://placehold.co/100';
    document.getElementById('profile-big-avatar').src = avatarSrc;
};
function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// --- DISCORD-STYLE NOTIFICATION ---
window.copyUsername = () => {
    // В currentUser.username лежит чистый логин без @
    const fullId = "@" + currentUser.username; 
    
    navigator.clipboard.writeText(fullId).then(() => {
        showToast("Ваш ID скопирован в буфер обмена");
    }).catch(err => {
        console.error('Ошибка копирования: ', err);
    });
};

function showToast(message) {
    // Удаляем старый тост если есть
    const oldToast = document.querySelector('.discord-toast');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.className = 'discord-toast';
    toast.textContent = message;
    
    document.body.appendChild(toast);

    // Force reflow для анимации
    void toast.offsetWidth; 

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}
