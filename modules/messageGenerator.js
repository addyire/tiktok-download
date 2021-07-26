const { MessageEmbed } = require('discord.js')

function settingsChange (message) {
  // Generate message embed
  const res = new MessageEmbed()

  // Set the title and description
  res.setTitle(':gear: Settings Updated')
  res.setDescription(message)

  // Turn the embed into json and return
  return res.toJSON()
}

module.exports = { settingsChange }
