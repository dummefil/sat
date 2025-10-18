let steamId;
let gameId;
onLoad(() => {

  steamId = storage.get('steamid');
  gameId = storage.get('gameid');

  document.querySelectorAll('#achiv-tracking').forEach(el => {
    el.addEventListener('click', trackAchievement);
  })

  document.querySelectorAll('#achiv-notes').forEach(el => {
    el.addEventListener('click', saveNote);
  })

  document.querySelectorAll('#achiv-duckduckgo').forEach(el => {
    el.addEventListener('click', openDuckDuckGo);
  })
});

function openDuckDuckGo (event) {
  event.stopPropagation();
  const url = this.dataset['url'];
  window.open(url, '_blank');
}

async function saveNote() {
  const id = this.dataset['id'];
  const note = this.dataset['note'];
  console.log(note);
  return;
  // console.log('Opening note', id, gameId, steamId);
  // storage.set(id, this.value);
  // const note = 'this is note';
  // await request('/achievement/note', { id, gameId, steamId, note });
}

async function trackAchievement() {
  const id = this.dataset['id'];
  console.log('Now tracking', id, gameId, steamId);
  const { tracked } = await request('/achievement/track', { id, gameId, steamId });
  if (tracked) {
    this.classList.add('active');
  } else {
    this.classList.remove('active');
  }
}

import fetch from "node-fetch";

export async function getLast3Achievements({ key, steamid, language = "english" }) {
  const base = "https://api.steampowered.com";

  // 1️⃣ последние 20 игр
  const recentUrl = `${base}/IPlayerService/GetRecentlyPlayedGames/v1/?key=${key}&steamid=${steamid}&count=20`;
  const recent = await fetch(recentUrl).then(r => r.json());
  const games = recent?.response?.games ?? [];
  if (!games.length) return [];

  const results = [];

  for (const g of games) {
    const appid = g.appid;
    const achUrl = `${base}/ISteamUserStats/GetPlayerAchievements/v1/?key=${key}&steamid=${steamid}&appid=${appid}&l=${language}`;
    const achRes = await fetch(achUrl).then(r => r.json()).catch(() => null);
    const list = achRes?.playerstats?.achievements ?? [];

    for (const a of list) {
      if (a.achieved && a.unlocktime) {
        results.push({
          appid,
          gameName: achRes.playerstats.gameName,
          apiname: a.apiname,
          unlocktime: a.unlocktime,
          unlockIso: new Date(a.unlocktime * 1000).toISOString(),
        });
      }
    }
  }

  // 2️⃣ сортируем и берём последние 3
  results.sort((a, b) => b.unlocktime - a.unlocktime);
  return results.slice(0, 3);
}

// пример вызова
const data = await getLast3Achievements({
  key: process.env.STEAM_API_KEY,
  steamid: "76561198000000000",
});
console.log(data);
