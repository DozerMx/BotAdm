const { 
    makeWASocket, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    useMultiFileAuthState, 
    downloadMediaMessage,
    extractMessageContent,
    proto 
} = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const yts = require('yt-search');
//const ytdl = require('ytdl-core'); // Removed as ytdl is not used anymore
//const chokidar = require('chokidar'); // Removed as chokidar is not used anymore
//const axios = require('axios'); // Removed as axios is not used anymore

// Sistemas de control
let antiLinksActive = false;
let antiNumsActive = false;
let antispamActive = false;

function extractMessageText(m) {
    return (
        m.message?.conversation ||
        m.message?.extendedTextMessage?.text ||
        m.message?.imageMessage?.caption ||
        m.message?.videoMessage?.caption ||
        m.message?.quotedMessage?.conversation ||
        m.message?.quotedMessage?.extendedTextMessage?.text ||
        ''
    ).trim();
}

const warningSystem = {
    warnings: {},
    reasons: {},
    
    addWarning(userId, reason) {
        if (!this.warnings[userId]) {
            this.warnings[userId] = 1;
            this.reasons[userId] = [reason];
        } else {
            this.warnings[userId]++;
            this.reasons[userId].push(reason);
        }
        return {
            count: this.warnings[userId],
            reasons: this.reasons[userId]
        };
    },
    
    getWarnings(userId) {
        return {
            count: this.warnings[userId] || 0,
            reasons: this.reasons[userId] || []
        };
    },
    
    clearWarnings(userId) {
        this.warnings[userId] = 0;
        this.reasons[userId] = [];
    }
};

function detectLink(message) {
    const linkRegex = /(https?:\/\/[^\s]+)/g;
    return message.match(linkRegex);
}

function isYouTubeURL(url) {
    if (!url) return false;
    return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)/.test(url);
}

function isSuspiciousNumber(number) {
    const cleanNumber = number.replace(/[^0-9]/g, '');
    
    const suspiciousCountryCodes = [
        '20', '212', '213', '216', '218', '249', '269', '252', '222', '253', 
        '962', '963', '964', '965', '966', '967', '968', '970', '971', '972', '973', '974', '975', 
        '93', '91', '880', '886', '960', '977', '92', '94', '98', '992', '993', '994', '995', '996', '998'
    ];
    
    return suspiciousCountryCodes.some(code => cleanNumber.startsWith(code));
}

//Removed downloadYouTubeAudio and downloadYouTubeVideo functions as they are not used anymore


const antispamSystem = {
    messages: {},
    warnings: {},

    checkSpam(userId, messageText) {
        if (!this.messages[userId]) {
            this.messages[userId] = [];
        }

        this.messages[userId].push({ text: messageText, timestamp: Date.now() });

        if (this.messages[userId].length > 10) {
            this.messages[userId] = this.messages[userId].slice(-10);
        }

        const repeatedMessages = this.messages[userId].filter(m => m.text === messageText).length;

        if (repeatedMessages >= 10) {
            if (!this.warnings[userId]) {
                this.warnings[userId] = 0;
            }
            this.warnings[userId]++;
            return true;
        }

        return false;
    },

    getWarnings(userId) {
        return this.warnings[userId] || 0;
    },

    resetWarnings(userId) {
        this.warnings[userId] = 0;
    }
};

module.exports = async (client, m) => {
    try {
        if (!m.message) return;

        const body = extractMessageText(m);
        const command = body.split(' ')[0].toLowerCase();
        const args = body.split(' ').slice(1);
        const isGroup = m.key.remoteJid.endsWith('@g.us');
        const sender = m.key.participant || m.key.remoteJid;
        const chat = m.key.remoteJid;

        const isAdmin = async () => {
            if (!isGroup) return false;
            const groupMetadata = await client.groupMetadata(chat);
            const admins = groupMetadata.participants.filter(p => p.admin !== null).map(p => p.id);
            return admins.includes(sender);
        };

        // Anti-spam check
        if (isGroup && antispamActive) {
            if (antispamSystem.checkSpam(sender, body)) {
                const warnings = antispamSystem.getWarnings(sender);
                await client.sendMessage(chat, { text: `⚠️ @${sender.split('@')[0]} advertencia por spam.\nAdvertencias: ${warnings}/3` });
                
                if (warnings >= 3) {
                    await client.groupParticipantsUpdate(chat, [sender], 'remove');
                    antispamSystem.resetWarnings(sender);
                    await client.sendMessage(chat, { text: `🚫 @${sender.split('@')[0]} ha sido expulsado por acumular 3 advertencias de spam.` });
                }
                return;
            }
        }

        // Anti-links check
        if (isGroup && antiLinksActive) {
            const links = detectLink(body);
            if (links && !(await isAdmin())) {
                const hasNonYouTubeLink = links.some(link => !isYouTubeURL(link));
                if (hasNonYouTubeLink) {
                    await client.sendMessage(chat, { delete: m.key });
                    const warning = warningSystem.addWarning(sender, "Envió un enlace no permitido");
                    await client.sendMessage(chat, { text: `⚠️ @${sender.split('@')[0]} advertido por enviar enlaces.\nAdvertencias: ${warning.count}/3` });
                    
                    if (warning.count >= 3) {
                        await client.groupParticipantsUpdate(chat, [sender], 'remove');
                        warningSystem.clearWarnings(sender);
                        await client.sendMessage(chat, { text: `🚫 @${sender.split('@')[0]} ha sido expulsado por acumular 3 advertencias.` });
                    }
                    return;
                }
            }
        }

        // Anti-numbers check
        if (isGroup && antiNumsActive && !(await isAdmin())) {
            if (isSuspiciousNumber(sender)) {
                await client.groupParticipantsUpdate(chat, [sender], 'remove');
                await client.sendMessage(chat, { text: `🚫 @${sender.split('@')[0]} ha sido expulsado por tener un número sospechoso.` });
                return;
            }
        }


        switch (command) {
            case '.menu':
    const menuMessage = `
╔═══🤖 *BOT MENU* 🤖═══╗

👥 *GRUPO* 👥
║ • *.kick @usuario*
║ • *.warn [razón]*
║ • *.closet*
║ • *.open*
║ • *.antlinks on/off*
║ • *.antnums on/off*
║ • *.tag* (Mencionar a todos)

🎵 *MULTIMEDIA* 🎵
║ • *.playmp3 [canción]*
║ • *.playmp4 [video]*

🛠️ *HERRAMIENTAS* 🛠️
║ • *.ping*
║ • *.antispam on/off*

╚══════════════════╝

*Usa los comandos con responsabilidad* 🚨
`;
    const menuOptions = {
        image: { url: 'src/menu.png' },
        caption: menuMessage,
        headerType: 4
    };
    await client.sendMessage(chat, menuOptions);
    break;

            case '.antnums':
                if (!isGroup || !await isAdmin()) return;
                if (args[0] === 'on') {
                    antiNumsActive = true;
                    await client.sendMessage(chat, { text: '🛡️ Sistema anti-números sospechosos activado' });
                } else if (args[0] === 'off') {
                    antiNumsActive = false;
                    await client.sendMessage(chat, { text: '🛡️ Sistema anti-números sospechosos desactivado' });
                } else {
                    await client.sendMessage(chat, { text: '❌ Uso correcto: .antnums on/off' });
                }
                break;

            case '.antlinks':
                if (!isGroup || !await isAdmin()) {
                    return client.sendMessage(chat, { text: '❌ Solo admins pueden usar este comando' });
                }
                if (args[0] === 'on') {
                    antiLinksActive = true;
                    await client.sendMessage(chat, { 
                        text: `🛡️ Sistema antienlaces activado\n\n` +
                              `✅ Enlaces de YouTube permitidos\n` +
                              `❌ Otros enlaces bloqueados para no-admins\n` +
                              `⚠️ 3 advertencias = expulsión`
                    });
                } else if (args[0] === 'off') {
                    antiLinksActive = false;
                    await client.sendMessage(chat, { text: '🛡️ Sistema antienlaces desactivado' });
                } else {
                    await client.sendMessage(chat, { text: '❌ Uso correcto: .antlinks on/off' });
                }
                break;

            case '.antispam':
                if (!isGroup || !await isAdmin()) {
                    return client.sendMessage(chat, { text: '❌ Solo admins pueden usar este comando' });
                }
                if (args[0] === 'on') {
                    antispamActive = true;
                    await client.sendMessage(chat, { text: '🛡️ Sistema anti-spam activado' });
                } else if (args[0] === 'off') {
                    antispamActive = false;
                    await client.sendMessage(chat, { text: '🛡️ Sistema anti-spam desactivado' });
                } else {
                    await client.sendMessage(chat, { text: '❌ Uso correcto: .antispam on/off' });
                }
                break;

            case '.warn':
                if (!isGroup || !await isAdmin()) return;
                if (!m.message.extendedTextMessage?.contextInfo?.mentionedJid) {
                    return client.sendMessage(chat, { text: '⚠️ Menciona al usuario y especifica la razón' });
                }
                
                const userId = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
                const reason = args.join(' ');
                const warningInfo = warningSystem.addWarning(userId, reason);
                
                let warningMessage = `⚠️ Advertencia para @${userId.split('@')[0]}\n`;
                warningMessage += `📝 Razón: ${reason}\n`;
                warningMessage += `🔔 Total: ${warningInfo.count}/3\n\nRazones anteriores:\n`;
                warningInfo.reasons.forEach((r, i) => warningMessage += `${i + 1}. ${r}\n`);
                
                await client.sendMessage(chat, { text: warningMessage });
                
                if (warningInfo.count >= 3) {
                    await client.groupParticipantsUpdate(chat, [userId], 'remove');
                    warningSystem.clearWarnings(userId);
                    await client.sendMessage(chat, { text: `🚫 Usuario expulsado por acumular 3 advertencias` });
                }
                break;

            case '.kick':
                if (!isGroup || !await isAdmin()) return;
                if (!m.message.extendedTextMessage?.contextInfo?.mentionedJid) return;
                await client.groupParticipantsUpdate(chat, m.message.extendedTextMessage.contextInfo.mentionedJid, 'remove');
                break;
                
            case '.tag':
                if (!isGroup) {
                    await client.sendMessage(chat, { text: '❌ Este comando solo funciona en grupos.' });
                    return;
                }
                if (!m.message.extendedTextMessage || !m.message.extendedTextMessage.contextInfo.quotedMessage) {
                    await client.sendMessage(chat, { text: '❌ Debes responder a un mensaje para usar este comando.' });
                    return;
                }
                
                try {
                    const groupMetadata = await client.groupMetadata(chat);
                    const participants = groupMetadata.participants;
                    
                    const quotedMessage = m.message.extendedTextMessage.contextInfo.quotedMessage;
                    const originalText = extractMessageText({ message: quotedMessage });
                    
                    const mentions = participants.map(p => p.id);
                    
                    await client.sendMessage(chat, {
                        text: originalText,
                        mentions: mentions
                    });
                } catch (error) {
                    console.error('Error en comando .tag:', error);
                    await client.sendMessage(chat, { text: '❌ Ocurrió un error al ejecutar el comando.' });
                }
                break;

            case '.closet':
                if (!isGroup || !await isAdmin()) return;
                await client.groupSettingUpdate(chat, 'announcement');
                await client.sendMessage(chat, { text: '🔒 Grupo cerrado' });
                break;

            case '.open':
                if (!isGroup || !await isAdmin()) return;
                await client.groupSettingUpdate(chat, 'not_announcement');
                await client.sendMessage(chat, { text: '🔓 Grupo abierto' });
                break;

            case '.playmp3':
                {
                    let randomAudioName;
                    try {
                        const mp3Input = args.join(' ');
                        if (!mp3Input) {
                            await client.sendMessage(chat, { text: '❌ Ingresa el nombre o link del audio' });
                            return;
                        }

                        await client.sendMessage(chat, { text: '🔍 Buscando...' });

                        let videoUrl;
                        let videoInfo;
                        
                        if (isYouTubeURL(mp3Input)) {
                            videoUrl = mp3Input;
                        } else {
                            const searchResult = await yts(mp3Input);
                            if (!searchResult.videos.length) {
                                await client.sendMessage(chat, { text: '❌ Audio no encontrado' });
                                return;
                            }
                            videoUrl = searchResult.videos[0].url;
                            videoInfo = searchResult.videos[0];
                        }

                        await client.sendMessage(chat, { text: '⬇️ Descargando audio...' });
                        
                        randomAudioName = path.join(__dirname, `temp_${Date.now()}.mp3`);

                        await new Promise((resolve, reject) => {
                            exec(`yt-dlp -f 'ba' -x --audio-format mp3 --audio-quality 0 --prefer-ffmpeg --extract-audio -o "${randomAudioName}" "${videoUrl}" --no-keep-video --no-warnings`, 
                                (error, stdout, stderr) => {
                                    if (error) reject(error);
                                    else resolve(stdout);
                                }
                            );
                        });

                        await client.sendMessage(chat, { text: '📤 Enviando audio...' });

                        await client.sendMessage(chat, {
                            audio: fs.readFileSync(randomAudioName),
                            mimetype: 'audio/mpeg',
                            fileName: `${videoInfo?.title || 'audio'}.mp3`
                        }, { quoted: m });

                    } catch (error) {
                        console.error('Error en playmp3:', error);
                        await client.sendMessage(chat, { 
                            text: '❌ Error al procesar el audio. Intenta con otro.',
                            quoted: m
                        });
                    } finally {
                        if (randomAudioName && fs.existsSync(randomAudioName)) {
                            fs.unlinkSync(randomAudioName);
                        }
                    }
                }
                break;

            case '.playmp4':
                {
                    let randomVideoName;
                    try {
                        const mp4Input = args.join(' ');
                        if (!mp4Input) {
                            await client.sendMessage(chat, { text: '❌ Ingresa el nombre o link del video' });
                            return;
                        }

                        await client.sendMessage(chat, { text: '🔍 Buscando...' });

                        let videoUrl;
                        let videoInfo;

                        if (isYouTubeURL(mp4Input)) {
                            videoUrl = mp4Input;
                            const searchResult = await yts(mp4Input);
                            videoInfo = searchResult.videos[0];
                        } else {
                            const searchResult = await yts(mp4Input);
                            if (!searchResult.videos.length) {
                                await client.sendMessage(chat, { text: '❌ Video no encontrado' });
                                return;
                            }
                            videoUrl = searchResult.videos[0].url;
                            videoInfo = searchResult.videos[0];
                        }

                        if (videoInfo.seconds > 600) {
                            await client.sendMessage(chat, { text: '❌ Video muy largo (máximo 10 minutos)' });
                            return;
                        }

                        await client.sendMessage(chat, { text: '⬇️ Descargando video...' });

                        randomVideoName = path.join(__dirname, `temp_${Date.now()}.mp4`);

                        await new Promise((resolve, reject) => {
                            exec(`yt-dlp -f 'bv*[height<=480]+ba' --merge-output-format mp4 --prefer-ffmpeg --no-warnings -o "${randomVideoName}" "${videoUrl}"`, 
                                (error, stdout, stderr) => {
                                    if (error) reject(error);
                                    else resolve(stdout);
                                }
                            );
                        });

                        if (!fs.existsSync(randomVideoName)) {
                            throw new Error('Fallo la descarga');
                        }

                        await client.sendMessage(chat, { text: '📤 Enviando video...' });

                        await client.sendMessage(chat, {
                            video: fs.readFileSync(randomVideoName),
                            caption: `✅ *${videoInfo.title}*\n⏱️ Duración: ${videoInfo.timestamp}`,
                            gifPlayback: false
                        }, { quoted: m });

                    } catch (error) {
                        console.error('Error en playmp4:', error);
                        await client.sendMessage(chat, { 
                            text: '❌ No se pudo procesar el video. Intenta con otro.',
                            quoted: m 
                        });
                    } finally {
                        if (randomVideoName && fs.existsSync(randomVideoName)) {
                            fs.unlinkSync(randomVideoName);
                        }
                    }
                }
                break;

            case '.ping':
                const start = Date.now();
                await client.sendMessage(chat, { text: '🏓 Pong!' });
                const end = Date.now();
                await client.sendMessage(chat, { text: `⏱️ Latencia: ${end - start}ms` });
                break;
                
                
        }
    } catch (err) {
        console.error('Error:', err);
    }
};

async function connectBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const client = makeWASocket({
        version,
        printQRInTerminal: true,
        auth: state,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000,
        emitOwnEvents: false,
        retryRequestDelayMs: 250
    });

    client.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                await connectBot();
            }
        } else if (connection === 'open') {
            console.log('Bot conectado');
        }
    });

    client.ev.on('creds.update', saveCreds);
    return client;
}

module.exports.connectBot = connectBot;

