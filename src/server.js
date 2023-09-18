const dotenv = require('dotenv')
const mongoose = require('mongoose')

const pino = require('pino');

function colorizeMessage(message, colorCode) {
  return `\x1b[1m\x1b[${colorCode}m${message}\x1b[0m`; // \x1b[1m para negrito
}

function createCustomLogger() {
  const logger = pino({
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        levelLabel: {
          trace: 'TRACE',
          debug: 'DEBUG',
          info: 'INFO',
          warn: 'WARN',
          error: 'ERROR',
          fatal: 'FATAL',
        },
      },
    },
  });

  const customLogger = {};

  // Mapeie as cores para os níveis de log correspondentes
  const logColors = {
    trace: 35,  // Cor magenta para TRACE
    debug: 34,  // Cor azul para DEBUG
    info: 32,   // Cor verde para INFO
    warn: 33,   // Cor amarela para WARN
    error: 31,  // Cor vermelha para ERROR
    fatal: 31,  // Cor vermelha para FATAL
  };

  // Mapeie emojis para os níveis de log correspondentes
  const logEmojis = {
    trace: ' ✔️ ',  // Emoji de sucesso para TRACE
    debug: ' ✔️',  // Emoji de sucesso para DEBUG
    info: ' ✔️ ',   // Emoji de sucesso para INFO
    warn: ' ⚠️ ',   // Emoji de atenção para WARN
    error: ' ❌' ,  // Emoji de erro para ERROR
    fatal: ' ❌' ,  // Emoji de erro para FATAL
  };

  // Defina funções personalizadas para cada nível de log
  ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach((level) => {
    customLogger[level] = (message) => {
      const coloredMessage = colorizeMessage(message, logColors[level]);
      const logMessage = `${logEmojis[level]} ${coloredMessage}`;
      logger[level](logMessage);
    };
  });

  return customLogger;
}

const logger = createCustomLogger();
dotenv.config()

const app = require('./config/express')
const config = require('./config/config')

const { Session } = require('./api/class/session')
const connectToCluster = require('./api/helper/connectMongoClient')

let server

if (config.mongoose.enabled) {
    mongoose.set('strictQuery', true);
    mongoose.connect(config.mongoose.url, config.mongoose.options).then(() => {
        logger.info('Conectado MongoDB')
    })
}

server = app.listen(config.port, async () => {
    logger.info(`Api online na porta ${config.port}`)
    global.mongoClient = await connectToCluster(config.mongoose.url)
    
    if (config.restoreSessionsOnStartup) {
        logger.info(`Restaurando sessões`)
        const session = new Session()
        let restoreSessions = await session.restoreSessions()
        logger.info(`${restoreSessions.length} Sessão(s) Restaurada(s)`)
    }
})

const exitHandler = () => {
    if (server) {
        server.close(() => {
            logger.info('Server closed')
            process.exit(1)
        })
    } else {
        process.exit(1)
    }
}

const unexpectedErrorHandler = (error) => {
    logger.error(error)
    exitHandler()
}

process.on('uncaughtException', unexpectedErrorHandler)
process.on('unhandledRejection', unexpectedErrorHandler)

process.on('SIGTERM', () => {
    logger.info('SIGTERM received')
    if (server) {
        server.close()
    }
})

module.exports = server
