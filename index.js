const express = require('express');
const requestPromise = require('request-promise');
const path = require('path');
const { JsonDB } = require('node-json-db');
const { Config } = require('node-json-db/dist/lib/JsonDBConfig');
const bodyParser = require('body-parser');
const morgan = require('morgan');

const db = new JsonDB(new Config("db", true, true, '/'));
const config = require('./config');

const app = express();

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('tiny'));
app.set('view engine', 'pug');
app.set('views', './views');

app.get('/', mainPageHandler);
app.post('/track', trackPostHandler);
app.get('*', anyPageHandler);

app.use(errorHandler);

const {port} = config.server;
app.listen(port, () => {
  console.log(`server running on port ${port}`);
});

async function mainPageHandler(req, res, next) {
  try {
    const { appid, steamid, lang = 'russian' } = req.query;
    const renderData = { title: 'Achievements tracker' };
    if (steamid && appid) {
      renderData.achievements = await getAchievements(appid, steamid, lang);
      renderData.steamid = steamid;
      renderData.appid = appid;
      try {
        db.getData(`/${steamid}/${appid}`);
      } catch (e) {
        db.push(`/${steamid}/${appid}`, {});
      }
    }

    res.render('index', renderData);
  } catch (error) {
    next(error)
  }
}

async function trackPostHandler(req, res, next) {
  try {
    const { id, steamId, gameId, tracked } = req.body;
    db.push(`/${steamId}/${gameId}/${id}`, tracked);
    console.log({ id, steamId, gameId, tracked });
    res.send({});
  } catch (error) {
    next(error);
  }
}

async function anyPageHandler(req, res, next) {
  res.redirect('/');
}

function errorHandler(error, req, res, next) {
  console.error(error);
  res.status(503);
  res.send('Error code: 503. Please contact dimatonkih@gmail.com')
}

async function getAchievements(appid, steamid, lang) {
  const gameData = await getGameData(appid, lang);
  const userAchievements = await getUserAchievements(steamid, appid, lang);
  const allAchievements = gameData.availableGameStats.achievements;
  return parseAchievements(allAchievements, userAchievements, steamid, appid);
}

async function getGameData(appid, lang) {
  const url = 'https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/';
  const { key } = config.steam;
  const qs = { key, appid, l: lang };
  const data = await request(url, qs);
  return data.game;
}

async function getUserAchievements(steamid, appid, lang) {
  const url = 'https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/';
  const { key } = config.steam;
  const qs = { key, steamid, appid, l: lang };
  const data = await request(url, qs);
  return data.playerstats.achievements;
}

async function parseAchievements(allAchievements, userAchievements, steamid, appid) {
  const unlocked = [];
  const locked = [];
  allAchievements.forEach((achiv, i) => {
    const unlockedState = userAchievements[i].achieved === 1;
    const unlocktime = userAchievements[i].unlocktime;
    const icon = unlockedState ? achiv.icon : achiv.icongray;
    const id = achiv.name;
    let tracked = false;
    try {
      tracked = db.getData(`/${steamid}/${appid}/${id}`);
    } catch (error) {}

    achiv.unlocked = unlockedState ? 'Unlocked' : 'Locked';
    achiv.unlocktime = unlocktime;
    achiv.icon = icon;
    achiv.id = id;
    achiv.tracked = tracked;
    achiv.trackedClass = tracked ? 'tracked' : '';
    if (unlockedState) {
      unlocked.push(achiv);
    } else {
      locked.push(achiv);
    }
  });

  const data = { unlocked, locked };
  // console.log(data);

  return data;
}

function request(url, qs) {
  function transform(body, requestObj) {
    console.log('Going to url:', requestObj.request.url.href);
    return body;
  }

  const requestConfig = {
    qs: { format: 'json', ...qs },
    transform,
    json: true,
  };
  return requestPromise(url, requestConfig);
}
