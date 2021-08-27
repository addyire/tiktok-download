const { SlashCommand } = require('slash-create')

const { ServerOptions } = require('../mongo')
const botInviteURL = require('../invite')
const { listBanned } = require('../messageGenerator')

module.exports = class SetColor extends SlashCommand {
  constructor (client, creator) {
    super(creator, {
      name: 'disable',
      description: 'Disable for a specific user or channel',
      guildIDS: ['855275193022021653'],
      options: [
        {
          type: 6,
          name: 'user',
          description: 'The user to disable'
        },
        {
          type: 7,
          name: 'channel',
          description: 'The channel to disable'
        }
      ]
    })
    this.client = client
  }

  onError () {}

  async run (interaction) {
    let hasPerms

    try {
      hasPerms = (await (await this.client.guilds.fetch(interaction.guildID)).members.fetch(interaction.user.id)).permissions.has('ADMINISTRATOR')
    } catch (err) {
      throw new Error(`I am not in this server as a bot. Please have an administrator click [this](${botInviteURL}) link to invite me.`)
    }

    if (!hasPerms) throw new Error('You must have the ADMINISTRATOR permission to change settings.')

    const serverOptions = await ServerOptions.findOneAndUpdate({ serverID: interaction.guildID }, {}, { upsert: true, new: true, setDefaultsOnInsert: true, useFindAndModify: false })
    const args = interaction.data.data.options === undefined
      ? {}
      : interaction.data.data.options.reduce((a, b) => {
        a[b.name] = b.value
        return a
      }, {})

    if (args.user && args.channel) throw new Error('You must specifiy either a user or channel to disable toktik download for.')

    if (args.channel) {
      const channelObj = await this.client.channels.fetch(args.channel)

      if (channelObj.type !== 'GUILD_TEXT') throw new Error('The channel you provided is not a text channel!')

      if (serverOptions.banned.channels.indexOf(args.channel) !== -1) {
        serverOptions.banned.channels = serverOptions.banned.channels.filter(i => i !== args.channel)
      } else {
        serverOptions.banned.channels.push(args.channel)
      }
    } else if (args.user) {
      if (serverOptions.banned.users.indexOf(args.user) !== -1) {
        serverOptions.banned.users = serverOptions.banned.users.filter(i => i !== args.user)
      } else {
        serverOptions.banned.users.push(args.user)
      }
    }

    const embed = await listBanned(serverOptions, this.client)

    await serverOptions.validate()
    await serverOptions.save()

    interaction.send({
      embeds: [embed] //,
      // components: [{
      //   type: ComponentType.ACTION_ROW,
      //   components: [{
      //     type: ComponentType.BUTTON,
      //     style: ButtonStyle.PRIMARY,
      //     label: 'butt',
      //     custom_id: 'my_butt',
      //     emoji: { name: '👌' }
      //   }]
      // }]
    })
  }
}
