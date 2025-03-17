require('./config')
const { default: f5vConnect, PHONENUMBER_MCC,makeCacheableSignalKeyStore,useMultiFileAuthState, delay, DisconnectReason, fetchLatestBaileysVersion, generateForwardMessageContent, prepareWAMessageMedia, generateWAMessageFromContent, generateMessageID, downloadContentFromMessage, makeInMemoryStore, jidDecode, proto, getAggregateVotesInPollMessage } = require("@whiskeysockets/baileys")
const pino = require('pino')
const PHONENUMBER_MCC = {
    "+57": "Colombia",
    "+52": "México",
    "+1": "Estados Unidos",
    // Agrega más códigos de país según sea necesario
};
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const yargs = require('yargs/yargs')
const FileType = require('file-type')
const path = require('path')
const _ = require('lodash')
const axios = require('axios')
const PhoneNumber = require('awesome-phonenumber')
const chalk = require('chalk')
let phoneNumber = "5531996505718"
const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code")
const useMobile = process.argv.includes("--mobile")
const readline = require("readline")
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise((resolve) => rl.question(text, resolve))
const NodeCache = require("node-cache")
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif')
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetchJson, await, sleep } = require('./lib/myfunc')
const { color } = require('./lib/color')


var low
try {low = require('lowdb')} catch (e) {low = require('./lib/lowdb')}

const { Low, JSONFile } = low
const mongoDB = require('./lib/mongoDB')
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) })
global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse())
async function startf5v() {
const store = makeInMemoryStore({ logger: pino().child({ level: 'debug', stream: 'store' }) })
const { state, saveCreds } = await useMultiFileAuthState('./lib/qrcode')
const { version, isLatest } = await fetchLatestBaileysVersion()
const msgRetryCounterCache = new NodeCache()
const f5v = f5vConnect({
logger: pino({ level: 'silent' }),
printQRInTerminal: !pairingCode,
mobile: useMobile, // !!PODE RESULTAR EM BAN!!
browser: ['Chrome (Linux)', '', ''], // https://github.com/WhiskeySockets/Baileys/issues/328
 auth: {
 creds: state.creds,
 keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
},
browser: ['Chrome (Linux)', '', ''], // https://github.com/WhiskeySockets/Baileys/issues/328
markOnlineOnConnect: true,
generateHighQualityLinkPreview: true,
getMessage: async (key) => {
 let jid = jidNormalizedUser(key.remoteJid)
 let msg = await store.loadMessage(jid, key.id)

 return msg?.message || ""
},
msgRetryCounterCache,
defaultQueryTimeoutMs: undefined, // https://github.com/WhiskeySockets/Baileys/issues/276
 })

store.bind(f5v.ev)

 if (pairingCode && !f5v.authState.creds.registered) {
if (useMobile) throw new Error('Não é possível o pareamento usando api móvel')

let phoneNumber
if (!!phoneNumber) {
 phoneNumber = phoneNumber.replace(/[^0-9]/g, '')

 if (!Object.keys(PHONENUMBER_MCC).some(v => phoneNumber.startsWith(v))) {
console.log(chalk.bgBlack(chalk.redBright("Seu número (com dddi) assim como no seu WhatsApp\n\nEx: +55 31 99650-5718")))
process.exit(0)
 }
} else {
 phoneNumber = await question(chalk.bgBlack(chalk.greenBright(`Digite seu número do WhatsApp\n\nEx: +55 31 99650-5718: `)))
 phoneNumber = phoneNumber.replace(/[^0-9]/g, '')


 if (!Object.keys(PHONENUMBER_MCC).some(v => phoneNumber.startsWith(v))) {
console.log(chalk.bgBlack(chalk.redBright("Seu número (com dddi) assim como no seu WhatsApp\n\nEx: +55 31 99650-5718")))

phoneNumber = await question(chalk.bgBlack(chalk.greenBright(`Digite seu número do WhatsApp\n\nEx: +55 31 99650-5718* : `)))
phoneNumber = phoneNumber.replace(/[^0-9]/g, '')
rl.close()
 }
}

setTimeout(async () => {
 let code = await f5v.requestPairingCode(phoneNumber)
 code = code?.match(/.{1,4}/g)?.join("-") || code
 console.log(chalk.black(chalk.bgGreen(`O seu código de emparelhamento : `)), chalk.black(chalk.white(code)))
}, 3000)
 }

f5v.ev.on('messages.upsert', async chatUpdate => {
//console.log(JSON.stringify(chatUpdate, undefined, 2))
try {
mek = chatUpdate.messages[0]
if (!mek.message) return
mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
if (mek.key && mek.key.remoteJid === 'status@broadcast') return
if (!f5v.public && !mek.key.fromMe && chatUpdate.type === 'notify') return
if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return
if (mek.key.id.startsWith('FatihArridho_')) return
m = smsg(f5v, mek, store)
require("./f5vbot")(f5v, m, chatUpdate, store)
} catch (err) {
console.log(err)
}
})


async function getMessage(key){
if (store) {
const msg = await store.loadMessage(key.remoteJid, key.id)
return msg?.message
}
return {
conversation: "f5v-bot"
}
}
f5v.ev.on('messages.update', async chatUpdate => {
for(const { key, update } of chatUpdate) {
if(update.pollUpdates && key.fromMe) {
const pollCreation = await getMessage(key)
if(pollCreation) {
const pollUpdate = await getAggregateVotesInPollMessage({
message: pollCreation,
pollUpdates: update.pollUpdates,
})
var toCmd = pollUpdate.filter(v => v.voters.length !== 0)[0]?.name
if (toCmd == undefined) return
var prefCmd = prefix+toCmd
f5v.appenTextMessage(prefCmd, chatUpdate)
}
}
}
})

f5v.ev.on('group-participants.update', async (anu) => {
console.log(anu)
try {
let metadata = await f5v.groupMetadata(anu.id)
let participants = anu.participants
for (let num of participants) {
// pega foto do usuario
try {
ppuser = await f5v.profilePictureUrl(num, 'image')
} catch {
ppuser = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQMCuAYEr6x2fdBuXmd4c0zj_cKQWEVjHosGKEkq5t9xqBkb7PTTPMfyLOl&s=10'
}


try {
ppgroup = await f5v.profilePictureUrl(anu.id, 'image')
} catch {
ppgroup = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQMCuAYEr6x2fdBuXmd4c0zj_cKQWEVjHosGKEkq5t9xqBkb7PTTPMfyLOl&s=10'
}

if (anu.action == 'add') {
} else if (anu.action == 'remove') {
} else if (anu.action == 'promote') {
} else if (anu.action == 'demote') {
}
}
} catch (err) {
console.log(err)
}
})


f5v.decodeJid = (jid) => {
if (!jid) return jid
if (/:\d+@/gi.test(jid)) {
let decode = jidDecode(jid) || {}
return decode.user && decode.server && decode.user + '@' + decode.server || jid
} else return jid
}

f5v.ev.on('contacts.update', update => {
for (let contact of update) {
let id = f5v.decodeJid(contact.id)
if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
}
})

f5v.getName = (jid, withoutContact= false) => {
id = f5v.decodeJid(jid)
withoutContact = f5v.withoutContact || withoutContact 
let v
if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
v = store.contacts[id] || {}
if (!(v.name || v.subject)) v = f5v.groupMetadata(id) || {}
resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'))
})
else v = id === '0@s.whatsapp.net' ? {
id,
name: 'WhatsApp'
} : id === f5v.decodeJid(f5v.user.id) ?
f5v.user :
(store.contacts[id] || {})
return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
}

f5v.sendContact = async (jid, kon, quoted = '', opts = {}) => {
let list = []
for (let i of kon) {
list.push({
displayName: await f5v.getName(i + '@s.whatsapp.net'),
vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${await f5v.getName(i + '@s.whatsapp.net')}\nFN:${await f5v.getName(i + '@s.whatsapp.net')}\nitem1.TEL;waid=${i}:${i}\nitem1.X-ABLabel:Ponsel\nitem2.EMAIL;type=INTERNET:naoeholuisnerd@gmail.com\nitem2.X-ABLabel:Email\nitem3.URL:https://instagram.com/luisnerd_\nitem3.X-ABLabel:Instagram\nitem4.ADR:;;Brazil;;;;\nitem4.X-ABLabel:Region\nEND:VCARD`
})
}
f5v.sendMessage(jid, { contacts: { displayName: `${list.length} Contatos`, contacts: list }, ...opts }, { quoted })
}

f5v.public = true

f5v.serializeM = (m) => smsg(f5v, m, store)

f5v.ev.on('connection.update', async (update) => {
 
const { connection, lastDisconnect } = update
const shouldReconnect = new Boom(lastDisconnect?.error)?.output.statusCode

if (connection === 'close') {

let reason = new Boom(lastDisconnect?.error)?.output.statusCode
if (reason === DisconnectReason.badSession) { console.log(`Arquivo de sessão inválido, exclua a sessão e verifique novamente`); f5v.logout(); }
else if (reason === DisconnectReason.connectionClosed) { console.log("| • Conexão encerrada, reconectando...."); startf5v(); }
else if (reason === DisconnectReason.connectionLost) { console.log("| • Conexão com servidor perdida, reconectando..."); startf5v(); }
else if (reason === DisconnectReason.connectionReplaced) { console.log("| • Conexão substituída, nova sessão aberta, feche a sessão atual"); f5v.logout(); }
else if (reason === DisconnectReason.loggedOut) { console.log(`| • Dispositivo desconectado, tente novamente.`); f5v.logout(); }
else if (reason === DisconnectReason.restartRequired) { console.log("....... reiniciando..."); startf5v(); }
else if (reason === DisconnectReason.timedOut) { console.log("....... reiniciando..."); startf5v(); }
else if (reason === DisconnectReason.Multidevicemismatch) { console.log("!!!! Erro tente novamente"); f5v.logout(); }
else f5v.end(`| • Desconectado! Motivo Desconhecido: ${reason}|${connection}`)
}

if (update.connection == "open" || update.receivedPendingNotifications == "true") {
const cfonts = require('cfonts');
var corzinhas = ["red","white","gray","redBright","whiteBright"];
const cor1 = corzinhas[Math.floor(Math.random() * (corzinhas.length))];	
const cor2 = corzinhas[Math.floor(Math.random() * (corzinhas.length))];	
const cor3 = corzinhas[Math.floor(Math.random() * (corzinhas.length))];
const cor4 = corzinhas[Math.floor(Math.random() * (corzinhas.length))];	

const banner = cfonts.render(('• ZetasGP-BOT •'), {
font: 'slick', 
align: 'center', 
colors: [`${cor1}`,`${cor3}`,`${cor4}`,`${cor2}`],
background: 'transparent',
letterSpacing: 1, 
lineHeight: 1,
space: true, 
maxLength: '0',
gradrient: [`${cor4}`,`${cor2}`], 
independentGradient: false, 
transitionGradient: false, 
env: 'node'
});
console.log(banner.string)
console.log(color(` `,'magenta'))
console.log(color(`> ......Conectado...... ` + JSON.stringify(f5v.user, null, 2), 'white'))
await delay(1999)
}
}
)
f5v.ev.on('creds.update', saveCreds)

f5v.sendPoll = (jid, name = '', values = [], selectableCount = 1) => { return f5v.sendMessage(jid, { poll: { name, values, selectableCount }}) }

 f5v.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
let mime = '';
let res = await axios.head(url)
mime = res.headers['content-type']
if (mime.split("/")[1] === "gif") {
 return f5v.sendMessage(jid, { video: await getBuffer(url), caption: caption, gifPlayback: true, ...options}, { quoted: quoted, ...options})
}
let type = mime.split("/")[0]+"Message"
if(mime === "application/pdf"){
 return f5v.sendMessage(jid, { document: await getBuffer(url), mimetype: 'application/pdf', caption: caption, ...options}, { quoted: quoted, ...options })
}
if(mime.split("/")[0] === "image"){
 return f5v.sendMessage(jid, { image: await getBuffer(url), caption: caption, ...options}, { quoted: quoted, ...options})
}
if(mime.split("/")[0] === "video"){
 return f5v.sendMessage(jid, { video: await getBuffer(url), caption: caption, mimetype: 'video/mp4', ...options}, { quoted: quoted, ...options })
}
if(mime.split("/")[0] === "audio"){
 return f5v.sendMessage(jid, { audio: await getBuffer(url), caption: caption, mimetype: 'audio/mpeg', ...options}, { quoted: quoted, ...options })
}
}

f5v.sendText = (jid, text, quoted = '', options) => f5v.sendMessage(jid, { text: text, ...options }, { quoted, ...options })

f5v.sendImage = async (jid, path, caption = '', quoted = '', options) => {
let buffer = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
return await f5v.sendMessage(jid, { image: buffer, caption: caption, ...options }, { quoted })
}

f5v.sendVideo = async (jid, path, caption = '', quoted = '', gif = false, options) => {
let buffer = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
return await f5v.sendMessage(jid, { video: buffer, caption: caption, gifPlayback: gif, ...options }, { quoted })
}

f5v.sendAudio = async (jid, path, quoted = '', ptt = false, options) => {
let buffer = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
return await f5v.sendMessage(jid, { audio: buffer, ptt: ptt, ...options }, { quoted })
}

f5v.sendTextWithMentions = async (jid, text, quoted, options = {}) => f5v.sendMessage(jid, { text: text, mentions: [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net'), ...options }, { quoted })

f5v.sendImageAsSticker = async (jid, path, quoted, options = {}) => {
let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
let buffer
if (options && (options.packname || options.author)) {
buffer = await writeExifImg(buff, options)
} else {
buffer = await imageToWebp(buff)
}

await f5v.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted })
return buffer
}

f5v.sendVideoAsSticker = async (jid, path, quoted, options = {}) => {
let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
let buffer
if (options && (options.packname || options.author)) {
buffer = await writeExifVid(buff, options)
} else {
buffer = await videoToWebp(buff)
}

await f5v.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted })
return buffer
}

f5v.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
let quoted = message.msg ? message.msg : message
let mime = (message.msg || message).mimetype || ''
let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
const stream = await downloadContentFromMessage(quoted, messageType)
let buffer = Buffer.from([])
for await(const chunk of stream) {
buffer = Buffer.concat([buffer, chunk])
}
let type = await FileType.fromBuffer(buffer)
trueFileName = attachExtension ? (filename + '.' + type.ext) : filename
await fs.writeFileSync(trueFileName, buffer)
return trueFileName
}

f5v.downloadMediaMessage = async (message) => {
let mime = (message.msg || message).mimetype || ''
let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
const stream = await downloadContentFromMessage(message, messageType)
let buffer = Buffer.from([])
for await(const chunk of stream) {
buffer = Buffer.concat([buffer, chunk])
}

return buffer
} 

f5v.sendMedia = async (jid, path, fileName = '', caption = '', quoted = '', options = {}) => {
let types = await f5v.getFile(path, true)
 let { mime, ext, res, data, filename } = types
 if (res && res.status !== 200 || file.length <= 65536) {
 try { throw { json: JSON.parse(file.toString()) } }
 catch (e) { if (e.json) throw e.json }
 }
 let type = '', mimetype = mime, pathFile = filename
 if (options.asDocument) type = 'document'
 if (options.asSticker || /webp/.test(mime)) {
let { writeExif } = require('./lib/exif')
let media = { mimetype: mime, data }
pathFile = await writeExif(media, { packname: options.packname ? options.packname : global.packname, author: options.author ? options.author : global.author, categories: options.categories ? options.categories : [] })
await fs.promises.unlink(filename)
type = 'sticker'
mimetype = 'image/webp'
}
else if (/image/.test(mime)) type = 'image'
else if (/video/.test(mime)) type = 'video'
else if (/audio/.test(mime)) type = 'audio'
else type = 'document'
await f5v.sendMessage(jid, { [type]: { url: pathFile }, caption, mimetype, fileName, ...options }, { quoted, ...options })
return fs.promises.unlink(pathFile)
}

f5v.copyNForward = async (jid, message, forceForward = false, options = {}) => {
let vtype
if (options.readViewOnce) {
message.message = message.message && message.message.ephemeralMessage && message.message.ephemeralMessage.message ? message.message.ephemeralMessage.message : (message.message || undefined)
vtype = Object.keys(message.message.viewOnceMessage.message)[0]
delete(message.message && message.message.ignore ? message.message.ignore : (message.message || undefined))
delete message.message.viewOnceMessage.message[vtype].viewOnce
message.message = {
...message.message.viewOnceMessage.message
}
}

let mtype = Object.keys(message.message)[0]
let content = await generateForwardMessageContent(message, forceForward)
let ctype = Object.keys(content)[0]
let context = {}
if (mtype != "conversation") context = message.message[mtype].contextInfo
content[ctype].contextInfo = {
...context,
...content[ctype].contextInfo
}
const waMessage = await generateWAMessageFromContent(jid, content, options ? {
...content[ctype],
...options,
...(options.contextInfo ? {
contextInfo: {
...content[ctype].contextInfo,
...options.contextInfo
}
} : {})
} : {})
await f5v.relayMessage(jid, waMessage.message, { messageId:waMessage.key.id })
return waMessage
}

f5v.cMod = (jid, copy, text = '', sender = f5v.user.id, options = {}) => {
//let copy = message.toJSON()
let mtype = Object.keys(copy.message)[0]
let isEphemeral = mtype === 'ephemeralMessage'
if (isEphemeral) {
mtype = Object.keys(copy.message.ephemeralMessage.message)[0]
}
let msg = isEphemeral ? copy.message.ephemeralMessage.message : copy.message
let content = msg[mtype]
if (typeof content === 'string') msg[mtype] = text || content
else if (content.caption) content.caption = text || content.caption
else if (content.text) content.text = text || content.text
if (typeof content !== 'string') msg[mtype] = {
...content,
...options
}
if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant
else if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant
if (copy.key.remoteJid.includes('@s.whatsapp.net')) sender = sender || copy.key.remoteJid
else if (copy.key.remoteJid.includes('@broadcast')) sender = sender || copy.key.remoteJid
copy.key.remoteJid = jid
copy.key.fromMe = sender === f5v.user.id

return proto.WebMessageInfo.fromObject(copy)
}


/**
 * 
 * @param {*} path 
 * @returns 
 */
f5v.getFile = async (PATH, save) => {
let res
let data = Buffer.isBuffer(PATH) ? PATH : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,`[1], 'base64') : /^https?:\/\//.test(PATH) ? await (res = await getBuffer(PATH)) : fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH)) : typeof PATH === 'string' ? PATH : Buffer.alloc(0)
//if (!Buffer.isBuffer(data)) throw new TypeError('Result is not a buffer')
let type = await FileType.fromBuffer(data) || {
mime: 'application/octet-stream',
ext: '.bin'
}
filename = path.join(__filename, '../src/' + new Date * 1 + '.' + type.ext)
if (data && save) fs.promises.writeFile(filename, data)
return {
res,
filename,
size: await getSizeMedia(data),
...type,
data
}

}

return f5v
}

startf5v()


let file = require.resolve(__filename)
fs.watchFile(file, () => {
fs.unwatchFile(file)
console.log(chalk.redBright(`Atualizacao= ${__filename}`))
delete require.cache[file]
require(file)
})
