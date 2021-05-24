const { createLogger, format, transports } = require('winston')
const { combine, timestamp, json, simple } = format
const path = require('path')

const logPath = path.join(__dirname, '..', 'logs', 'tiktok.log')

const logger = createLogger({
  format: combine(
    timestamp(),
    json()
  ),
  transports: [
    new transports.Console({
      level: 'info',
      format: simple()
    }),
    new transports.File({
      filename: logPath,
      level: 'debug'
    })
  ]
})

module.exports = logger
