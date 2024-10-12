const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode-terminal');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(bodyParser.json());

let isClientReady = false;
let client = new Client({
    authStrategy: new LocalAuth({ clientId: "user_whatsapp" }) // Will persist the session automatically
});
({ client, isClientReady } = setup_client(client, isClientReady));

function setup_client(client, isClientReady) {
    // Add error and auth failure handlers
    client.on('auth_failure', (msg) => {
        console.error('AUTHENTICATION FAILURE:', msg);
    });

    client.on('error', (error) => {
        console.error('CLIENT ERROR:', error);
    });

    // Display QR code for logging into WhatsApp
    client.on('qr', (qr) => {
        qrcode.generate(qr, { small: true });
        console.log('QR Code received, scan it with your phone.');
    });

    // Log in when ready
    client.on('ready', () => {
        console.log('WhatsApp Web Client is ready.');
        isClientReady = true;
    });

    // Update status when disconnected
    client.on('disconnected', (reason) => {
        console.log('Client was logged out', reason);
        isClientReady = false;
    });

    // Initialize the WhatsApp client (MUST be after event handlers)
    client.initialize();

    return { client, isClientReady }; // Return as an object
}

function log_out(text, data){
    const yellow = '\x1b[33m';
    const green = '\x1b[32m';
    const reset = '\x1b[0m';
    console.log(`${yellow}${text}: ${green}${data}${reset}`)
}

// Logging middleware to log requests and responses
app.use((req, res, next) => {
    const start = Date.now();
    const originalSend = res.send;

    // Log request details
    console.log(`\n${"-".repeat(50)}`)
    log_out("Incoming request from",req.ip)
    log_out("Request URL",req.originalUrl)
    log_out("Request Method", req.method)
    //log_out("Request Headers", JSON.stringify(req.headers, null, 2))
    log_out("Request Body", JSON.stringify(req.body, null, 2))

    // Intercept the response and log it
    res.send = function (body) {
        log_out("Response Status", res.statusCode);
        log_out("Response Body", body);
        originalSend.call(this, body);
    };

    next();
});


// Test endpoint to return 'Hello World'
app.get('/test', (req, res) => {
    res.send('Hello World');
});

// Health-check endpoint to return client status
app.get('/health-check', (req, res) => {
    if (isClientReady) {
        return res.json({ status: 'good' });
    } else {
        return res.json({ status: 'bad' });
    }
});

// Endpoint to dump credentials
app.get('/dump-credentials', async (req, res) => {
    const sessionDir = './.wwebjs_auth/session-user_whatsapp/';
    const credentials = {};

    try {
        const files = await fs.promises.readdir(sessionDir);

        await Promise.all(files.map(async (file) => {
            const filePath = path.join(sessionDir, file);
            const stats = await fs.promises.stat(filePath);

            if (stats.isFile()) {
                const data = await fs.promises.readFile(filePath, 'utf-8');
                credentials[file] = data;
                console.log(`${file}: ${data}`);
            }
        }));

        res.json(credentials);
    } catch (err) {
        console.error("Failed to dump credentials:", err);
        res.status(500).json({ error: "Failed to dump credentials" });
    }
});


// Endpoint to scan QR and log it for login
app.get('/scan-qr', (req, res) => {
    client.on('qr', (qr) => {
        qrcode.generate(qr, { small: true });
        console.log('QR Code received, scan it with your phone.');
    });

    res.send('Scan QR code to log in.');
});

// Endpoint to load credentials
app.post('/load-credentials', (req, res) => {
    const { credentials } = req.body;
    const sessionDir = './.wwebjs_auth/session-user_whatsapp/';

    if (!credentials || typeof credentials !== 'object') {
        return res.status(400).json({ error: "Invalid credentials format" });
    }

    // Write the credentials to the session files
    try {
        for (let file in credentials) {
            fs.writeFileSync(sessionDir + file, credentials[file], 'utf-8');
            console.log(`Loaded credentials for file: ${file}`);
        }

        res.json({ success: "Credentials loaded successfully" });
    } catch (error) {
        console.error('Error loading credentials:', error);
        res.status(500).json({ error: "Failed to load credentials" });
    }
});

// Endpoint to read messages from a specific chat
app.post('/read_messages', async (req, res) => {
    const { target_name, date_range } = req.body;
    try {
        const chats = await client.getChats();
        const targetChat = chats.find(chat => chat.name === target_name);

        if (!targetChat) {
            return res.status(404).json({ error: "Chat not found" });
        }

        const messages = await targetChat.fetchMessages();

        if (date_range) {
            const { startDate, endDate } = date_range;
            const filteredMessages = messages.filter(msg => {
                const msgDate = new Date(msg.timestamp * 1000);
                return msgDate >= new Date(startDate) && msgDate <= new Date(endDate);
            });
            return res.json(filteredMessages);
        } else {
            return res.json(messages);
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to read messages" });
    }
});

app.post('/write_message', async (req, res) => {
    const { target_name, message } = req.body;
    try {
        const chats = await client.getChats();
        const targetChat = chats.find(chat => chat.name === target_name);

        if (!targetChat) {
            return res.status(404).json({ error: "Chat not found" });
        }

        await client.sendMessage(targetChat.id._serialized, message);
        return res.json({ success: "Message sent" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to send message" });
    }
});

const callbackFunction = (payload) => {
    console.log('Hello:', payload); // Modify this to whatever behavior you want
};

let webhookSet = false; // Flag to track if webhook is already set

app.post('/web_hook', (req, res) => {
    const { target_name } = req.body;

    if (!webhookSet) { // Only set up the webhook listener once
        client.on('message_create', async (msg) => {
            const chat = await msg.getChat();
            console.log(msg)

            if (chat.name === target_name) {
                const payload = { 
                    from: msg.from, 
                    body: msg.body, 
                    timestamp: msg.timestamp 
                };

                console.log(`Callback triggered for message from ${target_name}:`, payload);
                callbackFunction(payload);
            }
        });
        res.json({ success: `Webhook set for ${target_name}` });
        webhookSet = true; // Set the flag to true after setting up the listener
    }
    else{
        res.json({ success:  `webhook already set for ${target_name}`});
    }

});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
