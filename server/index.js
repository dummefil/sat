require('dotenv').config()

const express = require('express');
const path = require('path');
const { JsonDB } = require('node-json-db');
const { Config } = require('node-json-db/dist/lib/JsonDBConfig');
const morgan = require('morgan');

const config = require('../config');
const {getGameData, getGameName, getSteamUserData, getAchievements} = require("./steamApi");
const db = require("./db");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(morgan('tiny'));
app.set('view engine', 'pug');
app.set('views', './views');

app.get('/', mainPageHandler);
app.post('/track', trackPostHandler);

function errorHandler(err, req, res, next) {
  console.error(err);
  res.status(500).send('Internal Server Error. Please contact support.');
}
app.use(errorHandler);

async function prepareTemplateData ({ appid, language, steamid }) {
  const renderData = {};
  const [gameData, gameName, userData] = await Promise.all([
    getGameData(appid, language),
    getGameName(appid),
    getSteamUserData(steamid)
  ])
  renderData.achievements = await getAchievements(gameData, appid, steamid, language);
  renderData.steamid = steamid;
  renderData.appid = appid;
  renderData.gameName = gameName;
  renderData.userData = userData;
  return renderData;
}

async function mainPageHandler(req, res) {
  const { appid, steamid, lang } = req.query;
  const language = lang || config.defaultLanguage || 'russian';

  if (steamid && appid) {
    const renderData = {
      title: 'Achievements Tracker',
      ...(await prepareTemplateData({appid, language, steamid}))}

    if (!db.exists(`/${steamid}/${appid}`)) {
      db.push(`/${steamid}/${appid}`, {});
    }
    return res.render('pages/tracked', renderData);
  }

  return res.render('pages/index')
}

async function trackPostHandler(req, res) {
  const { id, steamId, gameId, tracked } = req.body;
  db.push(`/${steamId}/${gameId}/${id}`, tracked);
  console.log({ id, steamId, gameId, tracked });
  res.send({});
}


const { port } = config.server;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});