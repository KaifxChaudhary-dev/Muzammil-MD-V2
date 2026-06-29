const express = require('express');
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const Pino = require('pino');

const app = express();
const PORT = process.env.PORT || 3000;

let sock = null;
let isConnected = false;
let isReady = false;
let botName = 'Muzammil MD';
let ownerNumber = '923039107958';

app.use(express.json());

// HTML Page
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Muzammil MD</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: rgba(255,255,255,0.05);
            backdrop-filter: blur(20px);
            border-radius: 30px;
            padding: 40px;
            max-width: 450px;
            width: 100%;
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 25px 50px rgba(0,0,0,0.5);
            text-align: center;
        }
        .bot-icon { font-size: 70px; display: block; margin-bottom: 10px; }
        .bot-name { color: #fff; font-size: 30px; font-weight: 700; }
        .bot-name span { color: #4fc3f7; }
        .subtitle { color: #aaa; font-size: 14px; margin-top: 5px; margin-bottom: 25px; }
        .status-box {
            background: rgba(255,255,255,0.08);
            border-radius: 15px;
            padding: 15px;
            margin-bottom: 20px;
        }
        .status-text { color: #fff; font-size: 16px; }
        .status-dot {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 10px;
        }
        .status-dot.online { background: #4caf50; box-shadow: 0 0 15px #4caf50; }
        .status-dot.offline { background: #f44336; box-shadow: 0 0 15px #f44336; }
        .status-dot.ready { background: #4fc3f7; box-shadow: 0 0 15px #4fc3f7; animation: pulse 1s infinite; }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.3; }
            100% { opacity: 1; }
        }
        .pair-box {
            background: rgba(255,255,255,0.08);
            border-radius: 15px;
            padding: 25px;
            border: 1px solid rgba(255,255,255,0.05);
        }
        .pair-box h3 { color: #fff; font-size: 16px; margin-bottom: 15px; }
        .input-group { display: flex; gap: 10px; }
        .input-group input {
            flex: 1;
            padding: 14px 18px;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            background: rgba(255,255,255,0.05);
            color: #fff;
            font-size: 15px;
            outline: none;
            transition: 0.3s;
        }
        .input-group input:focus {
            border-color: #4fc3f7;
            background: rgba(255,255,255,0.1);
        }
        .input-group input::placeholder { color: #666; }
        .btn {
            padding: 14px 30px;
            border: none;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: 0.3s;
            color: #fff;
        }
        .btn-primary {
            background: linear-gradient(135deg, #4fc3f7, #0288d1);
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(79,195,247,0.3);
        }
        .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
        .btn-danger {
            background: linear-gradient(135deg, #ef5350, #c62828);
            margin-top: 10px;
        }
        .btn-danger:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(239,83,80,0.3);
        }
        .code-display {
            background: rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 15px;
            margin-top: 15px;
            color: #4fc3f7;
            font-size: 28px;
            font-weight: 700;
            letter-spacing: 5px;
            display: none;
        }
        .code-display.show { display: block; }
        .btn-group { display: flex; gap: 10px; margin-top: 15px; }
        .btn-group .btn { flex: 1; }
        .footer {
            margin-top: 25px;
            padding-top: 20px;
            border-top: 1px solid rgba(255,255,255,0.05);
            color: #666;
            font-size: 13px;
        }
        .footer .pro { color: #ffd54f; font-weight: 600; }
        .toast {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.85);
            color: #fff;
            padding: 12px 30px;
            border-radius: 50px;
            font-size: 14px;
            display: none;
            z-index: 1000;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
        }
        .toast.show { display: block; animation: slideUp 0.3s ease; }
        .toast.success { border-color: #4caf50; }
        .toast.error { border-color: #f44336; }
        @keyframes slideUp {
            from { opacity: 0; transform: translateX(-50%) translateY(20px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @media (max-width: 480px) {
            .container { padding: 25px; }
            .input-group { flex-direction: column; }
            .btn-group { flex-direction: column; }
        }
    </style>
</head>
<body>
    <div class="container">
        <span class="bot-icon">🤖</span>
        <h1 class="bot-name">Muzammil <span>MD</span></h1>
        <p class="subtitle">WhatsApp Bot Panel</p>

        <div class="status-box">
            <div class="status-text">
                <span class="status-dot offline" id="statusDot"></span>
                <span id="statusText">Disconnected</span>
            </div>
        </div>

        <div class="pair-box">
            <h3>📱 Login with Phone Number</h3>
            <div class="input-group">
                <input type="text" id="phoneInput" placeholder="923001234567">
                <button class="btn btn-primary" id="pairBtn">Pair</button>
            </div>
            <div class="code-display" id="codeDisplay">
                Code: <span id="pairCode">123456</span>
            </div>
        </div>

        <div class="btn-group">
            <button class="btn btn-danger" id="logoutBtn">🚪 Logout</button>
        </div>

        <div class="footer">
            ✍️ <span class="pro">Prowed By: Wasif Ali</span>
            <br>
            <span style="font-size:11px;color:#555;">Made with ❤️ | Muzammil MD</span>
        </div>
    </div>

    <div class="toast" id="toast"></div>

    <script>
        const statusText = document.getElementById('statusText');
        const statusDot = document.getElementById('statusDot');
        const phoneInput = document.getElementById('phoneInput');
        const pairBtn = document.getElementById('pairBtn');
        const codeDisplay = document.getElementById('codeDisplay');
        const pairCode = document.getElementById('pairCode');
        const logoutBtn = document.getElementById('logoutBtn');
        const toast = document.getElementById('toast');
        let toastTimeout = null;

        function showToast(msg, type = 'success') {
            toast.textContent = msg;
            toast.className = 'toast show ' + type;
            clearTimeout(toastTimeout);
            toastTimeout = setTimeout(() => { toast.className = 'toast'; }, 4000);
        }

        function updateStatus(data) {
            if (data.connected) {
                statusText.textContent = '✅ Connected';
                statusDot.className = 'status-dot online';
                pairBtn.disabled = false;
            } else if (data.ready) {
                statusText.textContent = '🟢 Ready to Pair';
                statusDot.className = 'status-dot ready';
                pairBtn.disabled = false;
            } else {
                statusText.textContent = '⛔ Connecting...';
                statusDot.className = 'status-dot offline';
                pairBtn.disabled = true;
            }
            if (data.code) {
                pairCode.textContent = data.code;
                codeDisplay.className = 'code-display show';
            } else {
                codeDisplay.className = 'code-display';
            }
        }

        async function fetchStatus() {
            try {
                const res = await fetch('/status');
                const data = await res.json();
                updateStatus(data);
            } catch (e) { console.error(e); }
        }

        async function pairNumber() {
            const phone = phoneInput.value.trim();
            if (!phone) { showToast('Enter phone number!', 'error'); return; }
            if (!/^[0-9]{10,15}$/.test(phone)) {
                showToast('Invalid! Use: 923001234567', 'error');
                return;
            }
            pairBtn.disabled = true;
            pairBtn.textContent = '⏳ Sending...';
            try {
                const res = await fetch('/pair', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('✅ Code sent! Check WhatsApp', 'success');
                    if (data.code) {
                        pairCode.textContent = data.code;
                        codeDisplay.className = 'code-display show';
                    }
                } else {
                    showToast('❌ ' + data.error, 'error');
                }
            } catch (e) {
                showToast('❌ Error pairing!', 'error');
            }
            pairBtn.disabled = false;
            pairBtn.textContent = 'Pair';
        }

        async function logout() {
            if (!confirm('Logout?')) return;
            try {
                const res = await fetch('/logout', { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    showToast('✅ Logged out', 'success');
                    setTimeout(() => location.reload(), 1000);
                }
            } catch (e) { showToast('❌ Error logging out', 'error'); }
        }

        pairBtn.addEventListener('click', pairNumber);
        logoutBtn.addEventListener('click', logout);
        phoneInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') pairNumber();
        });

        fetchStatus();
        setInterval(fetchStatus, 3000);
    </script>
</body>
</html>
    `);
});

// API
app.get('/status', (req, res) => {
    res.json({ connected: isConnected, ready: isReady });
});

app.post('/pair', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.json({ success: false, error: 'Phone required' });
    try {
        if (!sock || !isReady) {
            return res.json({ success: false, error: 'Wait 10 seconds...' });
        }
        const code = await sock.requestPairingCode(phone);
        console.log(`📱 Code sent to ${phone}: ${code}`);
        res.json({ success: true, code });
    } catch (error) {
        res.json({ success: false, error: 'Try again' });
    }
});

app.post('/logout', (req, res) => {
    try {
        if (sock) sock.end();
        isConnected = false;
        isReady = false;
        sock = null;
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Server: http://0.0.0.0:${PORT}`);
    console.log(`🤖 ${botName}`);
});

// WhatsApp Bot
async function startBot() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('session');
        sock = makeWASocket({
            logger: Pino({ level: 'silent' }),
            auth: state,
            printQRInTerminal: false,
            browser: ['Muzammil MD', 'Chrome', '1.0.0']
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'open') {
                isConnected = true;
                isReady = true;
                console.log(`✅ ${botName} Connected!`);
                console.log(`👤 ${sock.user?.name}`);
            }
            
            if (connection === 'close') {
                isConnected = false;
                isReady = false;
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                if (statusCode === 401) {
                    console.log('❌ Session expired');
                    process.exit(0);
                } else {
                    console.log('🔄 Reconnecting...');
                    setTimeout(startBot, 5000);
                }
            }
        });

        sock.ev.on('creds.update', saveCreds);

        // Commands
        sock.ev.on('messages.upsert', async (m) => {
            const msg = m.messages[0];
            if (!msg.message) return;
            const from = msg.key.remoteJid;
            const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            
            if (text === '.ping') {
                await sock.sendMessage(from, { text: '🏓 Pong!' });
            }
            if (text === '.info') {
                await sock.sendMessage(from, { 
                    text: `🤖 *${botName}*\n👑 Owner: ${ownerNumber}\n✍️ Prowed By: Wasif Ali`
                });
            }
        });

    } catch (error) {
        console.error('❌ Error:', error);
        setTimeout(startBot, 5000);
    }
}

console.log(`👑 Owner: ${ownerNumber}`);
startBot();
