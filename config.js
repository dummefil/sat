module.exports = {
  "server": {
    "port": process.env.PORT || 8081
  },
  "steam": {
    hideSteamKey: true,
    "key": process.env.STEAM_TOKEN,
  }
}
