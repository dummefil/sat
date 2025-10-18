module.exports = {
  "server": {
    "port": process.env.PORT
  },
  "steam": {
    hideSteamKey: process.env.HIDE_STEAM_TOKEN === 'true',
    "key": process.env.STEAM_TOKEN,
  }
}
