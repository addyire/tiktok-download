<div align="center">
    <img src="./other/readme/logo.png" height=150><br>
    <img alt="Discord" src="https://img.shields.io/discord/792286443660771359?logo=discord">
    <a href="https://discord.com/oauth2/authorize?client_id=819836629250080779&scope=bot&permissions=11264"><img src="https://img.shields.io/badge/servers-99%2B-green"></a>

    Discord bot that automatically downloads TikToks

</div>

## Features

- Easy to use
- Configurable
- Compresses videos when file is too large for Discord

## Invite

If you don't want to host the bot yourself you can get add it to your server [here](https://discord.com/oauth2/authorize?client_id=819836629250080779&scope=bot&permissions=11264)

## Commands

There are a few commands that allow you to configure the bot. 

- /autodownload 
- /details
- /help
- /progress
- /setcolor
- /settings

## Running

1. Run the following commands
```
git clone https://github.com/addyire/tiktok-download
cd tiktok-download
npm install
```
2. Create a `other/settings.json` file using the `settings.example.json` as reference.
3. Run with `npm start`

Note: Some videos may require compression to be sent. This is a very CPU intensive task. Currently this feature can not be disabled but will be added in a future release.