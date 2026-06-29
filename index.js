const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const Pino = require('pino');

const app = express();
const PORT = process.env.PORT || 3000;

let sock = null;
let isReady = false;
let isConnected = false;

// ============ MIDDLEWARE ============
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============ HTML PAGE ============
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Muzammil MD</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial;background:#1a1a2e;min-height:100vh;display:flex;justify-content:center;align-items:center;padding:20px}
        .container{background:rgba(255,255,255,0.05);border-radius:30px;padding:40px;max-width:450px;width:100%;border:1px solid rgba(255,255,255,0.1);text-align:center}
        h1{color:#fff;font-size:30px}
        h1 span{color:#4fc3f7}
        .subtitle{color:#aaa;font-size:14px;margin:10px 0 25px}
        .status-box{background:rgba(255,255,255,0.08);border-radius:15px;padding:15px;margin-bottom:20px;color:#fff;font-size:16px}
        .dot{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:10px}
        .dot.online{background:#4caf50;box-shadow:0 0 15px #4caf50}
        .dot.offline{background:#f44336}
        .dot.ready{background:#4fc3f7;animation:pulse 1s infinite}
        @keyframes pulse{0%{opacity:1}50%{opacity:0.3}100%{opacity:1}}
        .pair-box{background:rgba(255,255,255,0.08);border-radius:15px;padding:25px}
        .pair-box h3{color:#fff;margin-bottom:15px}
        .input-group{display:flex;gap:10px}
        .input-group input{flex:1;padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#fff;font-size:15px;outline:none}
        .input-group input:focus{border-color:#4fc3f7}
        .input-group input::placeholder{color:#666}
        .btn{padding:14px 30px;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;color:#fff;transition:0.3s}
        .btn-primary{background:linear-gradient(135deg,#4fc3f7,#0288d1)}
        .btn-primary:hover{transform:translateY(-2px);box-shadow:0 5px 20px rgba(79,195,247,0.3)}
        .btn-primary:disabled{opacity:0.5;cursor:not-allowed;transform:none}
        .btn-danger{background:linear-gradient(135deg,#ef5350,#c62828);margin-top:10px}
        .btn-danger:hover{transform:translateY(-2px)}
        .code{background:rgba(255,255,255,0.1);border-radius:12px;padding:15px;margin-top:15px;color:#4fc3f7;font-size:28px;font-weight:700;letter-spacing:5px;display:none}
        .code.show{display:block}
        .btn-group{display:flex;gap:10px;margin-top:15px}
        .btn-group .btn{flex:1}
        .footer{margin-top:25px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.05);color:#666;font-size:13px}
        .footer .pro{color:#ffd54f;font-weight:600}
        .toast{position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.9);color:#fff;padding:12px 30px;border-radius:50px;font-size:14px;display:none;z-index:1000;backdrop-filter:blur(10px)}
        .toast.show{display:block;animation:slideUp 0.3s ease}
        .toast.success{border:1px solid #4caf50}
        .toast.error{border:1px solid #f44336}
        @keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @media(max-width:480px){.container{padding:25px}.input-group{flex-direction:column}.btn-group{flex-direction:column}}
    </style>
</head>
<body>
    <div class="container">
        <h1>Muzammil <span>MD</span></h1>
        <p class="subtitle">WhatsApp Bot Panel</p>
        
        <div class="status-box">
            <span class="dot offline" id="dot"></span>
            <span id="status">Disconnected</span>
        </div>
        
        <div class="pair-box">
            <h3>📱 Login with Phone Number</h3>
            <div class="input-group">
                <input type="text" id="phone" placeholder="923001234567">
                <button class="btn btn-primary" id="pairBtn">Pair</button>
            </div>
            <div class="code" id="codeBox">Code: <span id="codeText">123456</span></div>
        </div>
        
        <div class="btn-group">
            <button class="btn btn-danger" id="logoutBtn">🚪 Logout</button>
        </div>
        
        <div class="footer">✍️ <span class="pro">Prowed By: Wasif Ali</span></div>
    </div>
    
    <div class="toast" id="toast"></div>

    <script>
        const dot = document.getElementById('dot');
        const statusEl = document.getElementById('status');
        const phone = document.getElementById('phone');
        const pairBtn = document.getElementById('pairBtn');
        const codeBox = document.getElementById('codeBox');
        const codeText = document.getElementById('codeText');
        const logoutBtn = document.getElementById('logoutBtn');
        const toast = document.getElementById('toast');
        let toastTimeout = null;

        function showToast(msg, type = 'success') {
            toast.textContent = msg;
            toast.className = 'toast show ' + type;
            clearTimeout(toastTimeout);
            toastTimeout = setTimeout(() => {
                toast.className = 'toast';
            }, 4000);
        }

        function updateStatus(data) {
            if (data.connected) {
                statusEl.textContent = '✅ Connected';
                dot.className = 'dot online';
                pairBtn.disabled = false;
            } else if (data.ready) {
                statusEl.textContent = '🟢 Ready to Pair';
                dot.className = 'dot ready';
                pairBtn.disabled = false;
            } else {
                statusEl.textContent = '⛔ Connecting...';
                dot.className = 'dot offline';
                pairBtn.disabled = true;
            }
            if (data.code) {
                codeText.textContent = data.code;
                codeBox.className = 'code show';
            } else {
                codeBox.className = 'code';
            }
        }

        async function fetchStatus() {
            try {
                const res = await fetch('/status');
                const data = await res.json();
                updateStatus(data);
            } catch (e) {
                console.error('Fetch error:', e);
            }
        }

        async function pairNumber() {
            const num = phone.value.trim();
            if (!num) {
                showToast('Please enter phone number!', 'error');
                return;
            }
            if (!/^[0-9]{10,15}$/.test(num)) {
                showToast('Invalid number! Use: 923001234567', 'error');
                return;
            }
            
            pairBtn.disabled = true;
            pairBtn.textContent = '⏳ Sending...';
            
            try {
                console.log('Sending pair request for:', num);
                const res = await fetch('/pair', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ phone: num })
                });
                
                const data = await res.json();
                console.log('Pair response:', data);
                
                if (data.success) {
                    showToast('✅ Code sent! Check WhatsApp', 'success');
                    if (data.code) {
                        codeText.textContent = data.code;
                        codeBox.className = 'code show';
                    }
                } else {
                    showToast('❌ ' + data.error, 'error');
                }
            } catch (error) {
                console.error('Pair error:', error);
                showToast('❌ Error: ' + error.message, 'error');
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
            } catch (e) {
                showToast('❌ Error logging out', 'error');
            }
        }

        pairBtn.onclick = pairNumber;
        logoutBtn.onclick = logout;
        phone.onkeypress = (e) => {
            if (e.key === 'Enter') pairNumber();
        };

        fetchStatus();
        setInterval(fetchStatus, 3000);
    </script>
</body>
</html>`);
});

// ============ API ============
app.get('/status', (req, res) => {
    res.json({ 
        connected: isConnected, 
        ready: isReady 
    });
});

app.post('/pair', async (req, res) => {
    const { phone } = req.body;
    console.log('Pair request received for:', phone);
    
    if (!phone) {
        return res.json({ success: false, error: 'Phone number required' });
    }
    
    try {
        if (!sock) {
            return res.json({ success: false, error: 'Bot not initialized' });
        }
        
        if (!isReady) {
            return res.json({ success: false, error: 'Bot is connecting... Wait 10 seconds' });
        }
        
        const code = await sock.requestPairingCode(phone);
        console.log(`✅ Pairing code sent to ${phone}: ${code}`);
        res.json({ success: true, code: code });
        
    } catch (error) {
        console.error('Pair error:', error);
        res.json({ success: false, error: error.message || 'Pairing failed' });
    }
});

app.post('/logout', async (req, res) => {
    try {
        if (sock) {
            await sock.logout();
        }
        isConnected = false;
        isReady = false;
        sock = null;
        res.json({ success: true });
        console.log('👋 Logged out');
    } catch (error) {
        console.error('Logout error:', error);
        res.json({ success: false, error: error.message });
    }
});

// ============ SERVER ============
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Server: http://0.0.0.0:${PORT}`);
    console.log('🤖 Muzammil MD');
});

// ============ WHATSAPP BOT ============
async function startBot() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('session');
        
        sock = makeWASocket({
            logger: Pino({ level: 'silent' }),
            auth: state,
            printQRInTerminal: false,
            browser: ['Muzammil MD', 'Chrome', '1.0'],
            connectTimeoutMs: 30000,
            defaultQueryTimeoutMs: 30000
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'open') {
                isConnected = true;
                isReady = true;
                console.log('✅ Connected!');
                console.log(`👤 ${sock.user?.name}`);
            }
            
            if (connection === 'close') {
                isConnected = false;
                isReady = false;
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                
                if (statusCode === 401) {
                    console.log('❌ Session expired');
                    setTimeout(startBot, 3000);
                } else {
                    console.log('🔄 Reconnecting...');
                    setTimeout(startBot, 5000);
                }
            }
        });

        sock.ev.on('creds.update', saveCreds);

        // ============ COMMANDS ============
        sock.ev.on('messages.upsert', async (m) => {
            const msg = m.messages[0];
            if (!msg.message || msg.key.fromMe) return;
            
            const from = msg.key.remoteJid;
            const text = msg.message?.conversation || 
                        msg.message?.extendedTextMessage?.text || '';
            
            if (text === '.ping') {
                await sock.sendMessage(from, { text: '🏓 Pong!' });
            }
            
            if (text === '.info') {
                await sock.sendMessage(from, { 
                    text: '🤖 Muzammil MD\n✍️ Prowed By: Wasif Ali'
                });
            }
        });

    } catch (error) {
        console.error('❌ Bot error:', error);
        setTimeout(startBot, 5000);
    }
}

console.log('👑 Owner: 923039107958');
startBot();
