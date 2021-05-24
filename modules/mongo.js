const mongoose = require('mongoose')

const { mongo } = require('../other/settings.json')

mongoose.connect(mongo, { useNewUrlParser: true })

const colorValidator = (v) => (/^#([0-9a-f]{3}){1,2}$/i).test(v)

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
      type: Boolean,
      default: true
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

const Server = mongoose.model('server', serverSchema)

module.exports = Server
