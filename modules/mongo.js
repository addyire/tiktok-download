// Require stuff
const mongoose = require('mongoose')
const { mongo } = require('../other/settings.json')

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
  serverID: String
})

// Load schema
const Server = mongoose.model('server', serverSchema)

// Export schema
module.exports = Server
