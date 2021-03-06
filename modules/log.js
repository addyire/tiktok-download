const { createLogger, format, transports } = require('winston')
const { combine, timestamp, errors, splat, printf } = format
const path = require('path')

const logPath = path.join(__dirname, '..', 'other', 'logs', 'tiktok.log')

const myFormat = printf((info, guild) => {
  const { level, message, timestamp } = info
  return `[${timestamp}] [${level}]${info.serverID ? ' [' + info.serverID + ']' : ''}: ${message}`
})

const logger = createLogger({
  transports: [
    new transports.Console({
      level: 'info',
      format: combine(
        errors({ stack: true }),
        format.colorize(),
        splat(),
        timestamp(),
        myFormat
      )
    }),
    new transports.File({
      filename: logPath,
      level: 'debug'
    })
  ]
})

module.exports = logger
