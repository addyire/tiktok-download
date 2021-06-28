const { SlashCreator, GatewayServer } = require('slash-create')
const path = require('path')
const Discord = require('discord.js')
const mongoose = require('mongoose')
const fs = require('fs')

const TikTokParser = require('./modules/tiktok')
const ServerSettings = require('./modules/mongo')
const { tiktokStarters, bot, status, owner, reinviteMessage } = require('./other/settings.json')
const log = require('./modules/log')
const inviteURL = require('./modules/invite')

// Initialize counters
let serverCount = 0
let memberCount = 0

// Initialize the bot and slash commands
const client = new Discord.Client()
const creator = new SlashCreator({
  applicationID: bot.id,
  publicKey: bot.public_key,
  token: bot.token
})

// Setup slash-create
creator
  .withServer(new GatewayServer(handler => client.ws.on('INTERACTION_CREATE', handler)))
  .registerCommands(fs.readdirSync(path.join(__dirname, 'modules', 'commands')).map(file => {
    return new (require(`./modules/commands/${file}`))(client, creator)
  }))
  .syncCommands()

// Whenever this is a slash-command error run this function...
creator.on('commandError', async (command, error, interaction) => {
  // Log error as a warning
  log.warn(error)

  // Create a empty reason string
  let reason = ''

  // If the error type is a validation error
  if (error instanceof mongoose.Error.ValidationError) {
    // For each of validation errors
    for (const field in error.errors) {
      // Add the reason to the message with a new line.
      const thisE = error.errors[field].properties
      reason += `${thisE.path}: ${thisE.message}\n`
    }
  } else {
    // Otherwise set the reason to the error message.
    reason = error.message
  }

  // Get the server options
  const serverOptions = await ServerSettings.findOneAndUpdate({ serverID: interaction.guildID }, {}, { upsert: true, new: true, setDefaultsOnInsert: true, useFindAndModify: true })

  // Create error message
  const e = new Discord.MessageEmbed()
    .setTitle(':rotating_light: Error')
    .setColor(serverOptions.color)
    .setDescription(reason)
    .setFooter(`If you believe this is a bug please contact ${owner.tag}`)
    .toJSON()

  // Respond with error
  interaction.send({ embeds: [e] })
})

// On bot ready...
client.on('ready', () => {
  // Log that the bot is ready.
  log.info('Bot ready!')
  log.info(`Invite Link: ${require('./modules/invite')}`)

  const sentMessages = []

  client.guilds.cache.forEach(async (item) => {
    if (reinviteMessage && !sentMessages.includes(item.ownerID)) {
      sentMessages.push(item.ownerID)

      const serverOwner = await item.members.fetch(item.ownerID)

      serverOwner.send(new Discord.MessageEmbed()
        .setTitle('Major Changes To TokTik Download')
        .setDescription(`Hello, you are getting this message because you are the owner of one or more servers with me in it. If you would like to change settings for me on your server, you must re-invite me to your server using [this](${inviteURL}) link. This is because I now use slash commands which require additional permissions. If you are fine with the default settings, you may ignore this message.`))
    }

    // If bot-list server then skip
    if (item.id === '110373943822540800') return

    // Add to the counters
    serverCount += 1
    memberCount += item.memberCount
  })

  // Log server and member count
  log.info(`I am in ${serverCount} servers, serving ${memberCount} users.`)

  // Every 15 minutes...
  setInterval(() => {
    // Set the bot presence
    client.user.setPresence({
      activity: { name: status },
      status: 'dnd'
    })
  }, 15 * 60 * 1000)
})

// Whenever the bot joins a server...
client.on('guildCreate', member => {
  // Add to the counters...
  serverCount += 1
  memberCount += member.memberCount

  // Log that joined a server
  log.info(`Joined a new server! Now I am in ${serverCount} servers`)

  // Send the bot owner a message
  messageOwner(`I just joined the server: "${member.name}". It has ${member.memberCount} users!\nServer Count: ${serverCount}`)
})

// Whenever the bot gets removed from a server...
client.on('guildDelete', server => {
  // Subtract from the counters...
  serverCount -= 1
  memberCount -= server.memberCount

  // Log that bot was removed
  log.info(`Got removed from a server! Now I am in ${serverCount} servers`)

  // Send bot owner a message
  messageOwner(`I was just removed from: "${server.name}" which had ${server.memberCount} users.\nServer Count: ${serverCount}`)
})

// On every message...
client.on('message', async message => {
  // Return if user is a bot
  if (message.author.bot) return

  // Find if there is a tiktok link in the message, if there is see if there is anything else
  const tiktok = getTikTokFromStr(message.content)
  const onlyTikTok = message.content.split(' ').length === 1

  // If no tiktok return
  if (tiktok === undefined) return

  // Figure out weather bot has permission to speak in the channel with the tiktok.
  // If not set the channel to the dm channel of the user who sent the tiktok
  const channel = message.channel.permissionsFor(client.user).has('SEND_MESSAGES') ? message.channel : message.author

  // Get options for this server
  const guildOptions = await ServerSettings.findOneAndUpdate({ serverID: message.guild.id }, {}, { upsert: true, new: true, setDefaultsOnInsert: true, useFindAndModify: true })

  // If they don't have autodownload enabled then return
  if (!guildOptions.autodownload.enabled) return

  // Define some variables
  let videoStatus, statusMessage

  // If they have progress messages enabled, create the message and send it
  if (guildOptions.progress.enabled) {
    // Creating the message
    videoStatus = {
      title: 'Video Status',
      description: 'Downloading the video and checking if compression is required...',
      color: guildOptions.color,
      fields: [
        { name: ':x: Downloaded', value: 'Waiting...', inline: true },
        { name: ':x: Compressed', value: 'Waiting...', inline: true }
      ]
    }

    // Sending it
    statusMessage = await channel.send({ embed: videoStatus })
  }

  // Log that the bot got a request for a video
  log.info(`Got request for video: ${tiktok}`)

  // Get the video data
  TikTokParser(tiktok, { statusMessage, videoStatus }, message.guild.id).then(async videoData => {
    // With the video data...

    // Start making the message its going to send
    const response = {
      files: [videoData.videoPath]
    }

    // If they have video details enabled...
    if (guildOptions.details.enabled) {
      // Set the response embed to be the information they want
      response.embed = {
        title: guildOptions.details.link ? 'View On TikTok' : undefined,
        description: guildOptions.details.description ? videoData.text : undefined,
        timestamp: guildOptions.details.requester ? new Date().toISOString() : undefined,
        color: guildOptions.color,
        url: guildOptions.details.link ? tiktok : undefined,
        author: guildOptions.details.author
          ? {
              name: `${videoData.authorMeta.nickName} (${videoData.authorMeta.name})`,
              icon_url: videoData.authorMeta.avatar
            }
          : undefined,
        // thumbnail: {
        //     url: thumbnail
        // },
        footer: guildOptions.details.requester
          ? {
              text: `Requested by ${message.author.tag}`,
              icon_url: message.author.avatarURL()
            }
          : undefined,
        fields: guildOptions.details.analytics
          ? [
              { name: ':arrow_forward: Plays', value: videoData.playCount, inline: true },
              { name: ':speech_left: Comments', value: videoData.commentCount, inline: true },
              { name: ':mailbox_with_mail: Shares', value: videoData.shareCount, inline: true }
            ]
          : undefined
      }
    }

    // Wait for message to send...
    await channel.send(response).catch(err => {
      log.error(`Failed to send video with error: ${err}`)
    })

    // If the message is deletable, and they have autodelete enabled, then...
    if (message.deletable && ((guildOptions.autodownload.deletemessage && guildOptions.autodownload.smartdelete && onlyTikTok) || (guildOptions.autodownload.deletemessage && !guildOptions.autodownload.smartdelete))) {
      log.info('Deleting original message')
      // Delete the video
      message.delete()
    }

    // If there was a status message...
    if (statusMessage && statusMessage.deletable) {
      log.info('Deleting status message')
      // Delete the status messsage.
      statusMessage.delete()
    }

    // Delete the local video file(s)
    videoData.purge()
  }).catch(err => {
    // If theres an error...

    if (statusMessage && statusMessage.deletable) {
      // Delete the status message if there is one
      statusMessage.delete()
    }

    // Log the error
    // TODO handle this better
    console.log(err)

    // Send user the error message
    channel.send(new Discord.MessageEmbed()
      .setTitle(err.message)
      .setColor(guildOptions.color)
    )
  })
})

// Function to get a tiktok url from a string
// The url could be anywhere in the string.
function getTikTokFromStr (msg) {
  // Split the string and for each element...
  for (const element of msg.split(' ')) {
    // Loop through all the possible tiktok video starters...
    for (const starter of tiktokStarters) {
      // If there is a match then return the item of the first array
      if (element.startsWith(starter)) return element
    }
  }

  // Otherwise return undefined because nothing was found
  return undefined
}

// Function that messages the owner
function messageOwner (msg) {
  // Get the owner by their ID
  client.users.fetch(owner.id).then(usr => {
    // Send them a message
    usr.send(msg)
  }).catch(err => log.error(`Error sending bot owner a message.\nError: ${err}\nMessage: ${msg}`))
}

// Dumb workaround for slash-create
module.exports = client

// Login with bot
client.login(bot.token)
