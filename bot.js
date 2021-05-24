const { SlashCreator, GatewayServer } = require('slash-create')
const path = require('path')
const Discord = require('discord.js')
const mongoose = require('mongoose')
const fs = require('fs')

const { TikTokParser } = require('./modules/tiktok')
const ServerSettings = require('./modules/mongo')
const { tiktokStarters, bot, status, owner } = require('./other/settings.json')
const log = require('./modules/log')

let serverCount = 0
let memberCount = 0

const client = new Discord.Client()
const creator = new SlashCreator({
  applicationID: bot.id,
  publicKey: bot.public_key,
  token: bot.token
})

creator
  .withServer(new GatewayServer(handler => client.ws.on('INTERACTION_CREATE', handler)))
  .registerCommands(fs.readdirSync(path.join(__dirname, 'modules', 'commands')).map(file => {
    return new (require(`./modules/commands/${file}`))(client, creator)
  }))

creator.on('commandError', async (command, error, interaction) => {
  console.log(error)

  let reason = ''

  if (error instanceof mongoose.Error.ValidationError) {
    for (const field in error.errors) {
      const thisE = error.errors[field].properties
      reason += `${thisE.path}: ${thisE.message}\n`
    }
  } else {
    reason = error.message
  }

  const serverOptions = await ServerSettings.findOneAndUpdate({ serverID: interaction.guildID }, {}, { upsert: true, new: true, setDefaultsOnInsert: true })

  const e = new Discord.MessageEmbed()
    .setTitle(':rotating_light: Error')
    .setColor(serverOptions.color)
    .setDescription(reason)
    .setFooter(`If you believe this is a bug please contact ${owner.tag}`)
    .toJSON()

  interaction.send({ embeds: [e] })
})

client.on('ready', () => {
  log.info('Bot ready!')

  client.guilds.cache.forEach((item) => {
    if (item.id === '110373943822540800') return

    serverCount += 1
    memberCount += item.memberCount
  })

  log.info(`I am in ${serverCount} servers, serving ${memberCount} users.`)

  setInterval(() => {
    client.user.setPresence({
      activity: { name: status },
      status: 'dnd'
    })
  }, 15 * 60 * 1000)
})

client.on('guildCreate', member => {
  serverCount += 1
  memberCount += member.memberCount

  log.info(`Joined a new server! Now I am in ${serverCount} servers`)

  client.users.fetch(owner.id).then(usr => {
    usr.send(`I just joined the server: "${member.name}". It has ${member.memberCount} users!\nServer Count: ${serverCount}`)
  }).catch(err => console.error(err + ' join error'))
})

client.on('guildDelete', server => {
  // TODO delete item from mongoose when leave

  serverCount -= 1
  memberCount -= server.memberCount

  log.info(`Got removed from a server! Now I am in ${serverCount} servers`)

  client.users.fetch(owner.id).then(usr => {
    usr.send(`I was just removed from: "${server.name}" which had ${server.memberCount} users.\nServer Count: ${serverCount}`)
  }).catch(err => console.error(err + ' remove error'))
})

client.on('message', async message => {
  if (message.author.bot) return

  const tiktok = getTikTokFromStr(message.content)
  const onlyTikTok = message.content.split(' ').length === 1

  if (tiktok === undefined) return

  const channel = message.channel.permissionsFor(client.user).has('SEND_MESSAGES') ? message.channel : message.author
  const guildOptions = await ServerSettings.findOneAndUpdate({ serverID: message.guild.id }, {}, { upsert: true, new: true, setDefaultsOnInsert: true })

  if (!guildOptions.autodownload.enabled) return

  let videoStatus, statusMessage

  if (guildOptions.progress.enabled) {
    videoStatus = {
      title: 'Video Status',
      description: 'Downloading the video and checking if compression is required...',
      color: guildOptions.color,
      fields: [
        { name: ':x: Downloaded', value: 'Waiting...', inline: true },
        { name: ':x: Compressed', value: 'Waiting...', inline: true }
      ]
    }
    statusMessage = await channel.send({ embed: videoStatus })
  }

  log.info(`Got request for video: ${tiktok}`)

  const videoData = await TikTokParser(tiktok, { statusMessage, videoStatus }, message.guild.id).catch(err => {
    console.log(err)
    channel.send(new Discord.MessageEmbed()
      .setTitle(err.message)
      .setColor(guildOptions.color)
    )
  })
  if (videoData === undefined) {
    if (statusMessage && statusMessage.deletable) {
      statusMessage.delete()
    }
    return
  }

  const response = {
    files: [videoData.videoPath]
  }

  if (guildOptions.details.enabled) {
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

  await channel.send(response)
  // (guildOptions["delete_message"] && onlyTikTok && message.deletable)
  if (message.deletable && ((guildOptions.autodownload.deletemessage && guildOptions.autodownload.smartdelete && onlyTikTok) || (guildOptions.autodownload.deletemessage && !guildOptions.autodownload.smartdelete))) {
    log.info('Deleting original message')
    message.delete()
  }
  if (statusMessage && statusMessage.deletable) {
    log.info('Deleting status message')
    statusMessage.delete()
  }

  videoData.purge()
})

function getTikTokFromStr (msg) {
  for (const element of msg.split(' ')) {
    for (const starter of tiktokStarters) {
      if (element.startsWith(starter)) return element
    }
  }

  return undefined
}

module.exports = client

client.login(bot.token)
