const winston = require('winston');

const consoleTransport = new winston.transports.Console();
winston.add(consoleTransport);
// winston.info('app started')

// const logger = winston.createLogger({
//     level: 'info',
//     format: winston.format.json(),
//     transports: [new winston.transports.Console()],
//   });
//   winston.add(logger);

module.exports = winston