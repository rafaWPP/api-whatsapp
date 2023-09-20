const { MongoClient } = require('mongodb')
const config = require('../../config/config')
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
module.exports = async function connectToCluster(uri) {
    let mongoClient

    try {
        mongoClient = new MongoClient(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        })
        logger.info('STATE: Connecting to MongoDB')
        await mongoClient.connect()
        logger.info('STATE: Successfully connected to MongoDB: '+config.mongoose.dbmongo)
        return mongoClient
    } catch (error) {
        logger.error('STATE: Connection to MongoDB failed!', error)
        process.exit()
    }
}
