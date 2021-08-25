const { SlashCreator, GatewayServer } = require('slash-create')
const path = require('path')
const Discord = require('discord.js')
const mongoose = require('mongoose')
const fs = require('fs')
const { MessageButton } = require('discord-buttons')

const TikTokParser = require('./modules/tiktok')
const ServerSettings = require('./modules/mongo')
const { bot, status, owner, emojis } = require('./other/settings.json')
const log = require('./modules/log')
const botInviteURL = require('./modules/invite')

const STARTERS = ['https://vm.tiktok.com/', 'http://vm.tiktok.com/', 'https://www.tiktok.com/', 'http://www.tiktok.com/', 'https://m.tiktok.com/v/', 'http://m.tiktok.com/v/', 'https://vt.tiktok.com/', 'http://vt.tiktok.com/']

// Initialize the bot and slash commands
const client = new Discord.Client()
require('discord-buttons')(client)
const creator = new SlashCreator({
  applicationID: bot.id,
  publicKey: bot.publicKey,
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
  if (error) {
    log.error(`${error.message}`, { serverID: interaction.guildID })
  }

  let e

  try {
    // Create a empty reason string
    let reason = ''

    // If the error type is a validation error
    if (error instanceof mongoose.Error.ValidationError) {
      // For each of validation errors
      for (const field in error.errors) {
        // Add the reason to the message with a new line.
        const thisE = error.errors[field]
        reason += `${thisE.path}: ${thisE.message}\n`
      }
    } else {
      // Otherwise set the reason to the error message.
      reason = error.message
    }

    // Create error message
    e = new Discord.MessageEmbed()
      .setTitle(':rotating_light: Error')
      .setColor('#ff0000')
      .setDescription(reason)
      .setFooter(`If you believe this is a bug please contact ${owner.tag}`)
      .toJSON()
  } catch (err) {
    log.error(`Fatal crash trying to generate error message: ${err}`)

    e = new Discord.MessageEmbed()
      .setTitle(':rotating_light: Fatal Error')
      .setDescription(`A fatal error has occurred. Please contact ${owner.tag} to report this bug.`)
      .setColor('#ff0000')
      .toJSON()
  } finally {
    // Respond with error
    interaction.send({ embeds: [e] })
  }
})

// On bot ready...
client.on('ready', () => {
  // Log that the bot is ready.
  log.info('Bot ready!')
  log.info(`Invite Link: ${botInviteURL}`)

  const [serverCount, memberCount] = getMemberServerCount()

  // Log server and member count
  log.info(`I am in ${serverCount} servers, serving ${memberCount} users.`)

  // Define function to update teh status
  const setStatus = () => {
    client.user.setPresence({
      activity: {
        name: status
      },
      status: 'dnd'
    })
  }

  // Run Now
  setStatus()
  // Every 15 minutes...
  setInterval(setStatus, 15 * 60 * 1000)
})

// Whenever the bot joins a server...
client.on('guildCreate', member => {
  // Get server and member count
  const [serverCount, memberCount] = getMemberServerCount()

  // Log that joined a server
  log.info(`Joined a new server! Now I am in ${serverCount} servers`)

  // Send the bot owner a message
  messageOwner(`I just joined the server: "${member.name}". It has ${member.memberCount} users!\nServer Count: ${serverCount} | Member Count: ${memberCount}`)
})

// Whenever the bot gets removed from a server...
client.on('guildDelete', server => {
  // Get server and member count
  const [serverCount, memberCount] = getMemberServerCount()

  // Generate the message
  const message = typeof server === 'undefined' ? 'A server I was in was just deleted.' : `I was just removed from: "${server.name}" which had ${server.memberCount} users.`

  // Log and send message to the owner
  log.info(`Got removed from a server! Now I am in ${serverCount} servers`)
  messageOwner(message + `\nServer Count: ${serverCount} | Member Count: ${memberCount}`)
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
  const guildOptions = await ServerSettings.findOneAndUpdate({ serverID: message.guild.id }, {}, { upsert: true, new: true, setDefaultsOnInsert: true, useFindAndModify: false })

  // If they don't have autodownload enabled then return
  if (!guildOptions.autodownload.enabled) return

  // Define some variables
  let videoStatus, statusMessage
  let statusUpdater = () => {}

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

    // Define status updater
    statusUpdater = (status) => {
      videoStatus.fields = status
      statusMessage.edit({ embed: videoStatus })
    }
  }

  // Log that the bot got a request for a video
  log.info(`📩 - Received Video: ${tiktok}`, { serverID: message.guild.id })

  // Get the video data
  TikTokParser(tiktok, message.guild.id, statusUpdater).then(async videoData => {
    // With the video data...

    // Start making the message its going to send
    const response = {
      files: [videoData.videoPath]
    }
    const serverDetails = guildOptions.details

    // If they have video details enabled...
    if (serverDetails.enabled && (serverDetails.description || serverDetails.requester || serverDetails.author || serverDetails.analytics)) {
      // Set the response embed to be the information they want
      const [title, url] = serverDetails.link === 'embed' || serverDetails.link === 'both' ? ['View On TikTok', tiktok] : [undefined, undefined]

      response.embed = {
        title,
        url,
        description: serverDetails.description ? videoData.text : undefined,
        timestamp: serverDetails.requester ? new Date().toISOString() : undefined,
        color: guildOptions.color,
        author: serverDetails.author
          ? {
              name: `${videoData.authorMeta.nickName} (${videoData.authorMeta.name})`,
              icon_url: videoData.authorMeta.avatar
            }
          : undefined,
        footer: serverDetails.requester
          ? {
              text: `Requested by ${message.author.tag}`,
              icon_url: message.author.avatarURL()
            }
          : undefined,
        fields: serverDetails.analytics
          ? [
              { name: ':arrow_forward: Plays', value: videoData.playCount, inline: true },
              { name: ':heart: Likes', value: videoData.diggCount, inline: true },
              { name: ':mailbox_with_mail: Shares', value: videoData.shareCount, inline: true }
            ]
          : undefined
      }
    }

    response.buttons = (serverDetails.link === 'button' || serverDetails.link === 'both') && serverDetails.enabled
      ? [new MessageButton()
          .setLabel('View On TikTok')
          .setStyle('url')
          .setEmoji(emojis.tiktok.id)
          .setURL(tiktok)]
      : undefined

    // Wait for message to send...
    await channel.send(response).catch(err => {
      log.error(`⚠️ - ERROR SENDING VIDEO\n${err}`, { serverID: message.guild.id })
    })

    // If the message is deletable, and they have autodelete enabled, then...
    if (message.deletable && ((guildOptions.autodownload.deletemessage && guildOptions.autodownload.smartdelete && onlyTikTok) || (guildOptions.autodownload.deletemessage && !guildOptions.autodownload.smartdelete))) {
      log.info('🗑️ - Deleting Original Message', { serverID: message.guild.id })
      // Delete the video
      message.delete()
    }

    // If there was a status message...
    if (statusMessage && statusMessage.deletable) {
      log.info('🗑️ - Deleting Status Message', { serverID: message.guild.id })
      // Delete the status messsage.
      statusMessage.delete()
    }

    // Delete the local video file(s)
    videoData.purge()
  }).catch(err => {
    // If theres an error...
    // Log error
    log.error(`⚠️ - ERROR PROCESSING VIDEO\n${err}`, { serverID: message.guild.id })

    if (statusMessage && statusMessage.deletable) {
      // Delete the status message if there is one
      statusMessage.delete()
    }

    // Send user the error message
    channel.send(new Discord.MessageEmbed()
      .setTitle(':rotating_light: Error')
      .setColor('#ff0000')
      .setDescription('I couldn\'t download that video for some reason. Check to make sure the video link is valid.')
      .setFooter(`Please contact \`${owner.tag}\` if you believe this is an error`)
    )
  })
})

// Function to get a tiktok url from a string
// The url could be anywhere in the string.
function getTikTokFromStr (msg) {
  // Split the string and for each element...
  for (const element of msg.split(' ')) {
    // Loop through all the possible tiktok video starters...
    for (const starter of STARTERS) {
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
  }).catch(err => log.error(`👤 - Couldn't Find Owner\nError: ${err}\nMessage: ${msg}`))
}

// Function to calculate member and server count
function getMemberServerCount () {
  return client.guilds.cache.reduce((acc, item) => {
    acc[0] += 1
    acc[1] += item.memberCount
    return acc
  }, [0, 0])
}

// Dumb workaround for slash-create
module.exports = client

// Login with bot
client.login(bot.token)
