const config = require("../config");
const db = require("./db");

async function getSteamUserData(steamid) {
    const data = await steamApiRequest('ISteamUser', 'GetPlayerSummaries', 'v2', { steamids: steamid })
    const { personaname, avatar, avatarmedium, avatarfull, } = data.response.players[0];

    return { personaname, avatar, avatarmedium, avatarfull };
}

async function getGameName(appid) {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appid}&l=en`
    const response  = await fetch(url);
    const json = await response.json();
    return json[appid]?.data?.name;
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
        const achievementData = db.exists(`/${steamid}/${appid}/${id}`) ? db.getData(`/${steamid}/${appid}/${id}`) : {};

        const achievement = {
            ...achiv,
            unlocktime,
            icon,
            id,
            ...achievementData,
        };

        (unlockedState ? unlocked : locked).push(achievement);
    });

    return { unlocked, locked, count: allAchievements.length };
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
    console.log('Going to URL', '[GET]:', requestUrl);

    const response = await fetch(fullUrl);
    if (!response.ok) {
        //todo add support if game doens't exists in library, now it will break everything
        console.error(response.error);
        return {}
        // throw new Error(`Steam API request failed with status ${response.status}`);
    }
    return response.json();
}

function buildUrl(url, params) {
    const queryString = new URLSearchParams(params).toString();
    return `${url}?${queryString}`;
}

module.exports = {
    getUserAchievements,
    getSteamUserData,
    getGameName,
    getAchievements,
    getGameData,
    steamApiRequest
}