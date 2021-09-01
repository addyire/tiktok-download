// Require stuff
const mongoose = require('mongoose')
const { mongo } = require('../other/settings.json')
const log = require('./log')

mongoose.connect(mongo, { useNewUrlParser: true, useUnifiedTopology: true })

// Define a function that checks if a string is a color code
const colorValidator = (v) => (/^#([0-9a-f]{3}){1,2}$/i).test(v)

// Create link style type
class LinkStyle extends mongoose.SchemaType {
  constructor (key, options) {
    super(key, options, 'LinkStyle')
  }

  cast (val) {
    if (['disabled', 'embed', 'button', 'both'].indexOf(val) === -1) {
      throw new Error('Not a valid type')
    }
    return val
  }
}

mongoose.Schema.Types.LinkStyle = LinkStyle

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
      type: LinkStyle,
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

// Export schema
module.exports = { ServerOptions }

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
