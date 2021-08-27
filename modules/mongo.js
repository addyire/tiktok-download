// Require stuff
const mongoose = require('mongoose')
const { mongo } = require('../other/settings.json')
const log = require('./log')

mongoose.connect(mongo, { useNewUrlParser: true, useUnifiedTopology: true })

// Define a function that checks if a string is a color code
const colorValidator = (v) => (/^#([0-9a-f]{3}){1,2}$/i).test(v)
const linkTypes = ['disabled', 'embed', 'button', 'both']

// Create the schema
const serverSchema = new mongoose.Schema({
  details: {
    enabled: {
      type: Boolean,
      default: true
    },
    description: {
      type: Boolean,
      default: true
    },
    author: {
      type: Boolean,
      default: true
    },
    requester: {
      type: Boolean,
      default: true
    },
    analytics: {
      type: Boolean,
      default: true
    },
    link: {
      type: String,
      validate: {
        validator: (v) => {
          if (linkTypes.indexOf(v) === -1) { return false } else return true
        },
        message: x => `${x.value} is not a valid type`
      },
      default: 'button'
    }
  },
  progress: {
    enabled: {
      type: Boolean,
      default: true
    }
  },
  autodownload: {
    enabled: {
      type: Boolean,
      default: true
    },
    deletemessage: {
      type: Boolean,
      default: true
    },
    smart: {
      type: Boolean,
      default: true
    }
  },
  color: {
    type: String,
    validate: {
      validator: colorValidator,
      message: p => `${p.value} is not a valid color.`
    },
    default: '#FF00FF'
  },
  limiter: {
    pastDownloads: [{
      paid: Boolean,
      compressed: Boolean
    }],
    paidDownloads: {
      type: Number,
      default: 0
    }
  },
  banned: {
    users: {
      type: [String],
      default: []
    },
    channels: {
      type: [String],
      default: []
    }
  },
  serverID: String
})

// Load schema
const ServerOptions = mongoose.model('server', serverSchema)

// Create tiktok schema
const downloadSchema = new mongoose.Schema({
  identity: {
    userID: String,
    serverID: String,
    interaction: Boolean
  },
  time: {
    timestamp: Date,
    timeTaken: Number
  },
  video: {
    url: String,
    size: Number,
    postCompressSize: Number,
    compressed: Boolean
  },
  errorProcessing: Boolean
})

//
const Download = mongoose.model('downloads', downloadSchema)

// Export schema
module.exports = { ServerOptions, Download }

// Log database events
mongoose.connection.on('connected', () => {
  log.info('Successfully connected to database!')
})
mongoose.connection.on('error', (err) => {
  log.error(`Mongo Error \n${err}`)
  console.error(err)
})
mongoose.connection.on('disconnected', () => {
  log.error('Disconnected from database!')
})
