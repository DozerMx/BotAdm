const fs = require('fs')
const chalk = require('chalk')
const chokidar = require('chokidar')

// Configuraciones globales
global.owner = ['573112444714']
global.NomeDoBot = `ZetasGP-Bot`
global.premium = ['573112444714']
global.travaSend = '10'
global.packname = 'f5v bot'
global.author = 'Tzp by: DozerMx'
global.sessionName = 'ZetasGp'
global.prefa = ['/']
global.sp = '>'

// Exportar configuraciones
module.exports = {
    reloadConfig: function() {
        try {
            // Eliminar caché del archivo de configuración
            delete require.cache[require.resolve(__filename)]
            
            // Volver a cargar las configuraciones
            const updatedConfig = require(__filename)
            
            console.log(chalk.greenBright(`✅ Configuración actualizada: ${__filename}`))
            
            // Retornar las configuraciones actualizadas
            return {
                owner: global.owner,
                NomeDoBot: global.NomeDoBot,
                premium: global.premium,
                travaSend: global.travaSend,
                packname: global.packname,
                author: global.author,
                sessionName: global.sessionName,
                prefa: global.prefa,
                sp: global.sp
            }
        } catch (error) {
            console.error(chalk.redBright(`❌ Error recargando configuración: ${error}`))
            return null
        }
    }
}

// Configurar vigilancia de archivos
if (require.main === module) {
    const watcher = chokidar.watch(__filename, {
        persistent: true,
        ignoreInitial: true
    })

    watcher.on('change', (path) => {
        console.log(chalk.yellowBright(`🔄 Detectado cambio en: ${path}`))
        module.exports.reloadConfig()
    })
}