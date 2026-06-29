const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const Pino = require('pino');
const express = require('express');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// ============ CONFIG ============
const BOT_NAME = 'Muzammil MD';
const OWNER_NUMBER = '923039107958';
const ADMIN_NUMBER = '923039107958';
const PREFIX = '.';
const SESSION_FILE = 'session.json';

let botStatus = 'Disconnected';
let qrCode = null;
let sock = null;
let botMode = 'public'; // public / private
let isConnected = false;
let pairingCode = null;

// ============ SERVE HTML ============
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ============ API ENDPOINTS ============
app.get('/status', (req, res) => {
    res.json({
        status: botStatus,
        connected: isConnected,
        mode: botMode,
        botName: BOT_NAME,
        owner: OWNER_NUMBER
    });
});

app.get('/qr', (req, res) => {
    res.json({
        qr: qrCode,
        connected: isConnected,
        pairingCode: pairingCode
    });
});

app.post('/setmode', (req, res) => {
    const { mode } = req.body;
    if (mode === 'public' || mode === 'private') {
        botMode = mode;
        res.json({ success: true, mode: botMode });
        console.log(`📌 Mode changed to: ${botMode}`);
    } else {
        res.json({ success: false, error: 'Invalid mode' });
    }
});

app.post('/pair', async (req, res) => {
    const { phone } = req.body;
    if (!phone) {
        return res.json({ success: false, error: 'Phone number required' });
    }
    
    try {
        if (!sock) {
            return res.json({ success: false, error: 'Bot not ready' });
        }
        
        const code = await sock.requestPairingCode(phone);
        pairingCode = code;
        res.json({ success: true, code: code });
        console.log(`📱 Pairing code sent to ${phone}: ${code}`);
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.post('/logout', (req, res) => {
    try {
        if (sock) {
            sock.end();
            sock = null;
        }
        if (fs.existsSync(SESSION_FILE)) {
            fs.unlinkSync(SESSION_FILE);
        }
        isConnected = false;
        botStatus = 'Disconnected';
        qrCode = null;
        pairingCode = null;
        res.json({ success: true });
        console.log('👋 Logged out successfully');
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// ============ START SERVER ============
app.listen(PORT, () => {
    console.log(`🌐 Server: http://localhost:${PORT}`);
    console.log(`🤖 ${BOT_NAME} is starting...`);
});

// ============ WHATSAPP BOT ============
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
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                qrCode = await QRCode.toDataURL(qr);
                botStatus = 'QR_READY';
                console.log('📱 QR Code generated');
            }
            
            if (connection === 'open') {
                isConnected = true;
                botStatus = 'Connected';
                qrCode = null;
                pairingCode = null;
                console.log(`✅ ${BOT_NAME} Connected!`);
                console.log(`👤 Logged in as: ${sock.user?.name}`);
                console.log(`📌 Mode: ${botMode}`);
                console.log(`👑 Owner: ${OWNER_NUMBER}`);
            }
            
            if (connection === 'close') {
                isConnected = false;
                botStatus = 'Disconnected';
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                if (statusCode === 401) {
                    console.log('❌ Session expired');
                    if (fs.existsSync(SESSION_FILE)) {
                        fs.unlinkSync(SESSION_FILE);
                    }
                } else {
                    console.log('🔄 Reconnecting...');
                    setTimeout(startBot, 5000);
                }
            }
        });

        sock.ev.on('creds.update', saveCreds);

        // ============ MESSAGE HANDLER ============
        sock.ev.on('messages.upsert', async (m) => {
            const msg = m.messages[0];
            if (!msg.message) return;

            const from = msg.key.remoteJid;
            const sender = msg.key.participant || from;
            const isGroup = from.endsWith('@g.us');
            
            let text = msg.message?.conversation || 
                      msg.message?.extendedTextMessage?.text || '';

            // ============ CHECK PERMISSION ============
            const isOwner = sender === OWNER_NUMBER + '@s.whatsapp.net' || 
                           sender === ADMIN_NUMBER + '@s.whatsapp.net';
            
            // ============ PRIVATE MODE ============
            if (botMode === 'private' && !isOwner) {
                // Only owner and admin can use bot
                await sock.sendMessage(from, {
                    text: `🔒 *${BOT_NAME} is in Private Mode*\n\nOnly Owner/Admin can use this bot.\nContact: wa.me/${OWNER_NUMBER}`
                });
                return;
            }

            // ============ COMMANDS ============
            if (text.startsWith(PREFIX)) {
                const args = text.slice(PREFIX.length).trim().split(/ +/);
                const command = args.shift().toLowerCase();

                // ====== PING ======
                if (command === 'ping') {
                    await sock.sendMessage(from, {
                        text: `🏓 *Pong!*\n\n📌 ${BOT_NAME}\n⏱️ Connected`
                    });
                }

                // ====== INFO ======
                else if (command === 'info') {
                    await sock.sendMessage(from, {
                        text: `🤖 *${BOT_NAME}*\n\n` +
                              `📌 Version: 2.0.0\n` +
                              `👑 Owner: ${OWNER_NUMBER}\n` +
                              `📱 Admin: ${ADMIN_NUMBER}\n` +
                              `📊 Mode: ${botMode.toUpperCase()}\n` +
                              `📡 Status: Online\n\n` +
                              `🛠️ *Commands*\n` +
                              `${PREFIX}ping - Check bot\n` +
                              `${PREFIX}info - Bot info\n` +
                              `${PREFIX}mode - Check mode\n` +
                              `${PREFIX}owner - Contact owner\n\n` +
                              `✍️ *Prowed By: Wasif Ali*`
                    });
                }

                // ====== MODE ======
                else if (command === 'mode') {
                    if (!isOwner) {
                        await sock.sendMessage(from, {
                            text: `❌ Only owner can check mode!`
                        });
                        return;
                    }
                    await sock.sendMessage(from, {
                        text: `📌 *Current Mode*\n\n🔹 ${botMode.toUpperCase()}\n\n${botMode === 'public' ? '🌍 Everyone can use' : '🔒 Only Owner/Admin'}`
                    });
                }

                // ====== SET MODE ======
                else if (command === 'setmode') {
                    if (!isOwner) {
                        await sock.sendMessage(from, {
                            text: `❌ Only owner can change mode!`
                        });
                        return;
                    }
                    
                    if (args.length === 0) {
                        await sock.sendMessage(from, {
                            text: `❌ Usage: ${PREFIX}setmode public/private`
                        });
                        return;
                    }
                    
                    const mode = args[0].toLowerCase();
                    if (mode === 'public' || mode === 'private') {
                        botMode = mode;
                        await sock.sendMessage(from, {
                            text: `✅ Mode changed to: *${mode.toUpperCase()}*`
                        });
                        console.log(`📌 Mode changed to: ${mode}`);
                    } else {
                        await sock.sendMessage(from, {
                            text: `❌ Invalid mode! Use: public or private`
                        });
                    }
                }

                // ====== OWNER ======
                else if (command === 'owner') {
                    await sock.sendMessage(from, {
                        text: `👑 *Owner*\n\n📱 ${OWNER_NUMBER}\n💬 Contact: wa.me/${OWNER_NUMBER}\n\n✍️ *Prowed By: Wasif Ali*`
                    });
                }

                // ====== HELP ======
                else if (command === 'help') {
                    let helpText = `🤖 *${BOT_NAME}* - Help Menu\n\n`;
                    helpText += `📌 *Commands*\n`;
                    helpText += `${PREFIX}ping - Check bot response\n`;
                    helpText += `${PREFIX}info - Bot information\n`;
                    helpText += `${PREFIX}mode - Check current mode\n`;
                    helpText += `${PREFIX}owner - Contact owner\n`;
                    helpText += `${PREFIX}help - Show this menu\n\n`;
                    
                    if (isOwner) {
                        helpText += `👑 *Owner Commands*\n`;
                        helpText += `${PREFIX}setmode public/private - Change mode\n`;
                        helpText += `${PREFIX}restart - Restart bot\n`;
                    }
                    
                    helpText += `\n✍️ *Prowed By: Wasif Ali*`;
                    
                    await sock.sendMessage(from, { text: helpText });
                }

                // ====== RESTART ======
                else if (command === 'restart') {
                    if (!isOwner) {
                        await sock.sendMessage(from, {
                            text: `❌ Only owner can restart!`
                        });
                        return;
                    }
                    await sock.sendMessage(from, {
                        text: `🔄 Restarting ${BOT_NAME}...`
                    });
                    console.log('🔄 Restarting...');
                    setTimeout(() => process.exit(0), 2000);
                }

                // ====== UNKNOWN ======
                else {
                    await sock.sendMessage(from, {
                        text: `❌ Unknown command!\nUse ${PREFIX}help for commands.`
                    });
                }
            }
        });

    } catch (error) {
        console.error('❌ Bot Error:', error);
        setTimeout(startBot, 5000);
    }
}

// ============ START BOT ============
startBot();

// ============ PROCESS HANDLERS ============
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});

process.on('SIGINT', () => {
    console.log('🛑 Bot stopped');
    process.exit(0);
});

console.log(`🤖 ${BOT_NAME} is running...`);
console.log(`👑 Owner: ${OWNER_NUMBER}`);
console.log(`📱 Admin: ${ADMIN_NUMBER}`);
console.log(`📌 Mode: ${botMode}`);
console.log(`🌐 Open http://localhost:${PORT}`);
