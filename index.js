require('dotenv').config()

const express = require('express');
const path = require('path');
const { JsonDB } = require('node-json-db');
const { Config } = require('node-json-db/dist/lib/JsonDBConfig');
const morgan = require('morgan');

const db = new JsonDB(new Config("db", true, true, '/'));
const config = require('./config');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('tiny'));
app.set('view engine', 'pug');
app.set('views', './views');

app.get('/', mainPageHandler);
app.post('/track', trackPostHandler);

app.use(errorHandler);

const { port } = config.server;
app.listen(port, () => {
  console.log(`server running on port ${port}`);
});

async function mainPageHandler(req, res) {
  const { appid, steamid, lang } = req.query;
  const language = lang || config.defaultLanguage || 'russian';
  const renderData = { title: 'Achievements Tracker' };

  if (steamid && appid) {
    const gameData = await getGameData(appid, language);
    renderData.achievements = await getAchievements(gameData, appid, steamid, language);
    renderData.steamid = steamid;
    console.log(gameData);
    renderData.appid = appid;
    renderData.gameName = gameData.gameName;

    if (!db.exists(`/${steamid}/${appid}`)) {
      db.push(`/${steamid}/${appid}`, {});
    }
  }

  res.render('index', renderData);
}

async function trackPostHandler(req, res) {
  const { id, steamId, gameId, tracked } = req.body;
  db.push(`/${steamId}/${gameId}/${id}`, tracked);
  console.log({ id, steamId, gameId, tracked });
  res.send({});
}

function errorHandler(err, req, res, next) {
  console.error(err);
  res.status(500).send('Internal Server Error. Please contact support.');
}

async function getAchievements(gameData, appid, steamid, lang) {
  const userAchievements = await getUserAchievements(steamid, appid, lang);
  const allAchievements = gameData.availableGameStats.achievements;
  return parseAchievements(allAchievements, userAchievements, steamid, appid);
}

async function getGameData(appid, lang) {
  const data = await steamApiRequest('ISteamUserStats', 'GetSchemaForGame', 'v2', { appid, l: lang });
  return data.game;
}

async function getUserAchievements(steamid, appid, lang) {
  const data = await steamApiRequest('ISteamUserStats', 'GetPlayerAchievements', 'v1', { steamid, appid, l: lang });
  return data.playerstats.achievements;
}

function parseAchievements(allAchievements, userAchievements, steamid, appid) {
  const unlocked = [];
  const locked = [];

  const userAchievementsMap = userAchievements.reduce((map, ach) => {
    map[ach.apiname] = ach;
    return map;
  }, {});

  allAchievements.forEach(achiv => {
    const id = achiv.name;
    const userAchiv = userAchievementsMap[id];
    const unlockedState = userAchiv && userAchiv.achieved === 1;
    const unlocktime = userAchiv ? userAchiv.unlocktime : null;
    const icon = unlockedState ? achiv.icon : achiv.icongray;
    const tracked = db.exists(`/${steamid}/${appid}/${id}`) ? db.getData(`/${steamid}/${appid}/${id}`) : false;

    const achievement = {
      ...achiv,
      unlocked: unlockedState ? 'Unlocked' : 'Locked',
      unlocktime,
      icon,
      id,
      tracked,
      trackedClass: tracked ? 'tracked' : '',
    };

    (unlockedState ? unlocked : locked).push(achievement);
  });

  return { unlocked, locked };
}

async function steamApiRequest(interfaceName, methodName, version, params) {
  const baseUrl = 'https://api.steampowered.com/';
  const { key } = config.steam;
  const url = `${baseUrl}${interfaceName}/${methodName}/${version}/`;
  const qs = { key, format: 'json', ...params };
  const fullUrl = buildUrl(url, qs);

  let requestUrl = fullUrl;
  if (config.steam.hideSteamKey) {
    requestUrl = requestUrl.replace(key, 'HIDDEN');
  }
  console.log('Going to URL:', requestUrl);

  const response = await fetch(fullUrl);
  if (!response.ok) {
    throw new Error(`Steam API request failed with status ${response.status}`);
  }
  return response.json();
}

function buildUrl(url, params) {
  const queryString = new URLSearchParams(params).toString();
  return `${url}?${queryString}`;
}
