require('dotenv').config();
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

let isClientReady = false;
let clientState = 'INITIALIZING';

const validateSecretKey = (req, res, next) => {
    const secretKey = req.headers['x-secret-key'] || req.body.secret_key;
    
    if (!secretKey) {
        return res.status(401).json({ 
            status: false, 
            message: 'Secret key diperlukan. Gunakan header x-secret-key atau body secret_key' 
        });
    }
    
    if (secretKey !== process.env.SECRET_KEY) {
        return res.status(401).json({ 
            status: false, 
            message: 'Secret key tidak valid' 
        });
    }
    
    next();
};

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './session_data'
    }),
    puppeteer: { 
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--single-process',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
        ]
    }
});

client.on('qr', qr => {
    console.log('Scan QR ini dengan WhatsApp:');
    qrcode.generate(qr, { small: true });
    isClientReady = false;
    clientState = 'QR_GENERATED';
});

client.on('ready', () => {
    console.log('WhatsApp client siap!');
    isClientReady = true;
    clientState = 'CONNECTED';
});

client.on('authenticated', () => {
    console.log('WhatsApp authenticated');
    clientState = 'AUTHENTICATED';
    setTimeout(() => {
        if (clientState === 'AUTHENTICATED') {
            isClientReady = true;
            clientState = 'CONNECTED';
            console.log('Client ready after authentication');
        }
    }, 5000);
});

client.on('auth_failure', msg => {
    console.error('Authentication failed', msg);
    isClientReady = false;
    clientState = 'AUTH_FAILURE';
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
    isClientReady = false;
    clientState = 'DISCONNECTED';
});

client.on('loading_screen', (percent, message) => {
    console.log('Loading screen', percent, message);
    clientState = 'LOADING';
    if (percent === 100) {
        setTimeout(() => {
            if (!isClientReady) {
                isClientReady = true;
                clientState = 'CONNECTED';
                console.log('Client ready after loading complete');
            }
        }, 3000);
    }
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const isValidPhoneNumber = (number) => {
    const cleanNumber = number.replace(/\D/g, '');
    return cleanNumber.length >= 10 && cleanNumber.length <= 15;
};

const formatPhoneNumber = (number) => {
    let cleanNumber = number.replace(/\D/g, '');
    
    if (cleanNumber.startsWith('0')) {
        cleanNumber = '62' + cleanNumber.substring(1);
    }
    
    if (!cleanNumber.startsWith('62') && cleanNumber.length > 10) {
        cleanNumber = '62' + cleanNumber;
    }
    
    return `${cleanNumber}@c.us`;
};

client.initialize();

app.post('/send-message', validateSecretKey, async (req, res) => {
    const { number, message } = req.body;

    if (!number || !message) {
        return res.status(400).json({ 
            status: false, 
            message: 'Parameter number dan message wajib diisi' 
        });
    }

    if (!isValidPhoneNumber(number)) {
        return res.status(400).json({
            status: false,
            message: 'Format nomor telepon tidak valid'
        });
    }

    if (!isClientReady || (clientState !== 'CONNECTED' && clientState !== 'AUTHENTICATED')) {
        return res.status(503).json({
            status: false,
            message: `WhatsApp client tidak ready. Status: ${clientState}. Tunggu beberapa saat lagi.`
        });
    }

    const chatId = number.includes('@c.us') ? number : formatPhoneNumber(number);

    try {
        await sleep(2000);
        
        const sentMessage = await client.sendMessage(chatId, message);
        
        res.json({ 
            status: true, 
            message: 'Pesan berhasil dikirim',
            to: chatId,
            messageId: sentMessage.id._serialized
        });
        
    } catch (error) {
        console.error('Error sending message:', error);
        
        if (error.message.includes('Chat not found')) {
            return res.status(404).json({
                status: false,
                message: 'Nomor WhatsApp tidak valid atau tidak terdaftar'
            });
        }

        if (error.message.includes('phone number is not registered')) {
            return res.status(404).json({
                status: false,
                message: 'Nomor WhatsApp tidak terdaftar'
            });
        }

        if (error.message.includes('Evaluation failed')) {
            isClientReady = false;
            clientState = 'ERROR';
            return res.status(503).json({
                status: false,
                message: 'Terjadi kesalahan pada WhatsApp session. Silakan restart aplikasi.'
            });
        }

        res.status(500).json({ 
            status: false, 
            message: 'Gagal mengirim pesan', 
            error: error.message 
        });
    }
});

app.get('/status', validateSecretKey, async (req, res) => {
    try {
        let currentState = clientState;
        
        if (isClientReady) {
            try {
                const state = await client.getState();
                currentState = state;
            } catch (error) {
                currentState = 'ERROR';
                isClientReady = false;
            }
        }

        res.json({
            status: true,
            message: 'API WhatsApp berjalan normal',
            clientReady: isClientReady,
            clientState: currentState,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.json({
            status: true,
            message: 'API WhatsApp berjalan normal',
            clientReady: false,
            clientState: 'ERROR',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/restart', validateSecretKey, async (req, res) => {
    try {
        isClientReady = false;
        clientState = 'RESTARTING';
        
        await client.destroy();
        
        setTimeout(() => {
            client.initialize();
        }, 2000);
        
        res.json({
            status: true,
            message: 'Client WhatsApp sedang di-restart'
        });
        
    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Gagal restart client',
            error: error.message
        });
    }
});

app.listen(port, () => {
    console.log(`API berjalan di http://localhost:${port}`);
});