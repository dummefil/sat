require('dotenv').config()

const express = require('express');
const path = require('path');
const morgan = require('morgan');

const config = require('../config');
const {getGameData, getGameName, getSteamUserData, getAchievements, steamApiRequest, getUserAchievements} = require("./steamApi");
const db = require("./db");
const fetch = require("node-fetch");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(morgan('tiny'));
app.set('view engine', 'pug');
app.set('views', './views');

app.get('/', mainPageHandler);
app.get('/dashboard', dashboardHandler);

app.post('/login', loginHandler)
app.post('/achievement/track', trackPostHandler);
app.post('/achievement/note', notePostHandler);

function errorHandler(err, req, res, next) {
  console.error(err);
  res.status(500).send('Internal Server Error. Please contact support.');
}
app.use(errorHandler);
app.use(/.*/, (req, res) => res.redirect('/'));

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

async function dashboardHandler (req, res) {
  const steamid = req.query.steamid;


  const recentCount = 10;
  const concurrency = 5;
  const lang = 'russian'
  //todo get 1/2 games you track and 3 latest games
  const { response } = await steamApiRequest('IPlayerService', 'GetRecentlyPlayedGames', 'v1', { count: recentCount, steamid });

  const games = response?.games ?? [];

  // games.map((el) => {
  //   const { appid, img_icon_url } = el;
  //   const iconUrl = `https://media.steampowered.com/steamcommunity/public/images/apps/${appid}/${img_icon_url}.jpg`;
  //   console.log(iconUrl);
  // })
  if (!games.length) return [];

  //limiter
  const queue = [];
  let active = 0;
  const run = fn => new Promise((res, rej) => {
    const exec = async () => {
      active++;
      try { res(await fn()); } catch (e) { rej(e); } finally { active--; next(); }
    };
    queue.push(exec); next();
  });
  const next = () => { while (active < concurrency && queue.length) queue.shift()(); };


  const perGameTasks = games.map(g => run(async () => {
    const r = await steamApiRequest('ISteamUserStats', 'GetPlayerAchievements', 'v1', { steamid, appid: g.appid, l: lang })
    const list = r?.playerstats?.achievements;
    if (!Array.isArray(list)) return null;

    const last = list
        .filter(a => a.achieved === 1 && a.unlocktime > 0)
        .sort((a, b) => b.unlocktime - a.unlocktime)[0];

    if (!last) return null;

    return {
      appid: g.appid,
      gameName: r.playerstats?.gameName || g.name || String(g.appid),
      apiname: last.apiname,
      unlocktime: last.unlocktime,
      unlockIso: new Date(last.unlocktime * 1000).toISOString()
    };
  }));

  const perGameLatest = (await Promise.allSettled(perGameTasks))
      .map(x => (x.status === "fulfilled" ? x.value : null))
      .filter(Boolean);

  perGameLatest.sort((a, b) => b.unlocktime - a.unlocktime);

  console.log(perGameLatest, perGameTasks);
  res.render('pages/dashboard', {steamid, games: perGameLatest });
}

const isValidSteamID = id =>
    typeof id === "string" &&
    /^\d{17}$/.test(id) &&
    id.startsWith("7656119");

async function loginHandler(req, res){
  let { steamid } = req.body;
  if (steamid.indexOf('steamcommunity') > -1) {
    steamid = steamid.split('/').filter(e => !!e).pop();
    if (isNaN(parseInt(steamid))) {
      const {response} = await steamApiRequest('ISteamUser', 'ResolveVanityURL', 'v1', { vanityUrl: steamid })
      steamid = response.steamid;
    }
  }

  if (!isValidSteamID(steamid)) {
    return res.send({ allowed: false, error: 'invalid steamid' });
  }

  const data = { steamid, allowed: true }
  res.send(data)
}

async function mainPageHandler(req, res) {
  const { appid, steamid, lang } = req.query;
  // const uiLang = lang || config.defaultLanguage || 'russian';
  const gameLang = lang || config.defaultLanguage || 'russian'

  if (steamid && appid) {
    const data = await prepareTemplateData({appid, gameLang, steamid});

    const title = `SAT|${data.gameName}`
    const renderData = {
      title,
      ...data,
    }

    if (!db.exists(`/${steamid}/${appid}`)) {
      db.push(`/${steamid}/${appid}`, {});
    }

    return res.render('pages/tracked', renderData);
  }

  const renderData = {
    title: 'SAT|Login',
  }

  return res.render('pages/index', renderData)
}


async function trackPostHandler(req, res) {
  const { id, steamId, gameId } = req.body;
  const dataPath = `/${steamId}/${gameId}/${id}`;
  if (!db.exists(dataPath)) {
    db.push(dataPath, {});
  }
  const savedData = db.getData(dataPath);
  const achievementData = { ...savedData, ...({ tracked: !savedData.tracked }) }

  db.push(dataPath, achievementData);
  res.send(achievementData);
}

async function notePostHandler(req, res) {
  const { id, steamId, gameId, note } = req.body;
  const dataPath = `/${steamId}/${gameId}/${id}`;
  if (!db.exists(dataPath)) {
    db.push(dataPath, {});
  }

  const savedData = db.getData(dataPath);
  const achievementData = { ...savedData, ...({ note }) }

  db.push(dataPath, achievementData);
  res.send(achievementData);
}

const { port } = config.server;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});