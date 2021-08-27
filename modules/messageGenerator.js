const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js')
const { emojis } = require('../other/settings.json')

function tikTokMessage (videoData, guildSettings, requester) {
  // Create response
  const tiktok = videoData.videoURL
  const response = {}

  // Define the server details for easier access
  const serverDetails = guildSettings.details
  // If they have video details enabled....
  if (serverDetails.enabled && (serverDetails.description || serverDetails.requester || serverDetails.author || serverDetails.analytics)) {
    // Set the response embed to be the information they want
    const [title, url] = serverDetails.link === 'embed' || serverDetails.link === 'both' ? ['View On TikTok', tiktok] : [undefined, undefined]

    response.embeds = [{
      title,
      url,
      description: serverDetails.description ? videoData.text : undefined,
      timestamp: serverDetails.requester ? new Date().toISOString() : undefined,
      color: parseInt(guildSettings.color.substring(1), 16),
      author: serverDetails.author
        ? {
            name: `${videoData.authorMeta.nickName} (${videoData.authorMeta.name})`,
            icon_url: videoData.authorMeta.avatar
          }
        : undefined,
      footer: serverDetails.requester
        ? {
            text: `Requested by ${requester.name}`,
            icon_url: requester.avatarURL
          }
        : undefined,
      fields: serverDetails.analytics
        ? [
            { name: ':arrow_forward: Plays', value: videoData.playCount, inline: true },
            { name: ':heart: Likes', value: videoData.diggCount, inline: true },
            { name: ':mailbox_with_mail: Shares', value: videoData.shareCount, inline: true }
          ]
        : undefined
    }]
  } else {
    response.embeds = [{
      description: 'Here\'s your video',
      color: parseInt(guildSettings.color.substring(1), 16)
    }]
  }

  // Add buttons if needed
  response.components = (serverDetails.link === 'button' || serverDetails.link === 'both') && serverDetails.enabled
    ? [new MessageActionRow()
        .addComponents(
          new MessageButton({
            style: 'LINK',
            emoji: emojis.tiktok,
            url: tiktok,
            label: 'View On TikTok'
          })
        )
      ]
    : undefined

  return response
}

async function listBanned (serverOptions, client) {
  const embed = new MessageEmbed()
    .setTitle('Disabled Users/Channels')
    .setDescription('Autodownload will not work for the following users or channels')
    .setColor(serverOptions.color)

  const { channels, users } = serverOptions.banned

  const userStr = users.length === 0 ? 'None' : await users.reduce(async (str, usr) => str + `${(await client.users.fetch(usr)).tag}\n`, '')
  const channelStr = channels.length === 0 ? 'None' : channels.reduce((str, id) => str + `<#${id}>\n`, '')

  embed.addFields({
    name: 'Channels',
    value: channelStr
  }, {
    name: 'Users',
    value: userStr
  })

  return embed.toJSON()
}

function settingsChange (message) {
  // Generate message embed
  const res = new MessageEmbed()

  // Set the title and description
  res.setTitle(':gear: Settings Updated')
  res.setDescription(message)

  // Turn the embed into json and return
  return res.toJSON()
}

module.exports = { settingsChange, tikTokMessage, listBanned }
