const { SlashCommand } = require('slash-create')
const fs = require('fs')

const { ServerOptions } = require('../mongo')
const TikTokParser = require('../tiktok')
const { owner } = require('../../other/settings.json')
const log = require('../log')
const { tikTokMessage } = require('../messageGenerator')

module.exports = class TikTok extends SlashCommand {
  constructor (client, creator) {
    super(creator, {
      name: 'tiktok',
      description: 'Downloads a TikTok',
      options: [
        {
          type: 3,
          name: 'url',
          description: 'The URL of the TikTok',
          required: true
        }
      ]
    })
  }

  onError () {}

  async run (interaction) {
    await interaction.defer()

    const serverOptions = await ServerOptions.findOneAndUpdate({ serverID: interaction.guildID }, {}, { upsert: true, new: true, setDefaultsOnInsert: true, useFindAndModify: false })

    const args = interaction.data.data.options === undefined
      ? {}
      : interaction.data.data.options.reduce((a, b) => {
        a[b.name] = b.value
        return a
      }, {})

    if (serverOptions.banned.users.indexOf(interaction.user.id) !== -1) throw new Error('You have been banned from using me.')
    if (!testURL(args.url)) throw new Error('Not a valid URL')

    log.info(`📩 - Processing Video: ${args.url}`, { serverID: interaction.guildID })

    TikTokParser(args.url, interaction.guildID, () => {}).then(videoData => {
      const requester = {
        avatarURL: interaction.user.avatarURL,
        name: `${interaction.user.username}#${interaction.user.discriminator}`
      }

      const response = tikTokMessage(videoData, serverOptions, requester, true)
      response.file = {
        name: 'tiktok.mp4',
        file: fs.readFileSync(videoData.videoPath)
      }

      interaction.send(response).then(() => {
        videoData.purge()
      })
    }).catch(err => {
      log.warn('Encountered this error while downloading video with interaction' + err, { serverID: interaction.guildID })

      const e = {
        title: ':rotating_light: Error',
        description: "I couldn't download that video for some reason. Check to make sure the video link is valid.",
        color: parseInt('FF0000', 16),
        footer: {
          text: `Please contact ${owner.tag} if you believe this is an error`
        }
      }

      interaction.send({ embeds: [e] })
    })
  }
}

function testURL (url) {
  return /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w\-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)/.test(url)
}
