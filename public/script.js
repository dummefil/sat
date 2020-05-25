let steamId;
let gameId;

// let storage;

function submitHandler(event) {
  event.preventDefault();
  event.stopPropagation();
  const steamid = document.querySelector('.steamid').value;
  const appid = document.querySelector('.appid').value;
  const lang = document.querySelector('.lang').value;
  const queryString = `?steamid=${steamid}&appid=${appid}&lang=${lang}`;
  this.removeEventListener('click', submitHandler);
  location.search = queryString;
}

document.addEventListener('DOMContentLoaded', () => {
  // storage = new Storage();
  steamId = document.querySelector('.steamid').value;
  gameId = document.querySelector('.appid').value;
  const submitBtn = document.querySelector('.header-submit');
  submitBtn.addEventListener('click', submitHandler);

  const achivBlocks = document.querySelectorAll('.achiv');

  achivBlocks.forEach((achivBlock) => {
    achivBlock.addEventListener('click', trackAchievement);
  })
});

//who cares about MEMEry leak ?
async function trackAchievement() {
  const id = this.dataset['id'];
  console.log('You clicked', id, gameId, steamId);
  let tracked = this.classList.contains('tracked');
  await request('/track', { id, tracked: !tracked, gameId, steamId });
  if (!tracked) {
    this.classList.add('tracked');
  } else {
    this.classList.remove('tracked');
  }
}

async function request(url, data) {
  const body = JSON.stringify(data);
  const fetchRequest = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body
  });
  return await fetchRequest.json();
}


// function trackAchievement() {
//   const id = this.dataset['id'];
//   console.log('You clicked', id, gameId, steamId);
//   const gameProfile = storage.get(steamId, gameId);
//   const index = gameProfile.tracked.indexOf(id);
//   if (index > -1) {
//     gameProfile.tracked.push(id);
//   } else {
//     gameProfile.tracked.slice(index, index + 1);
//   }
//   storage.set(steamId, gameId, 'tracking', gameProfile.tracked)
// }

// class Storage {
//   _storage = localStorage;
//   set(steamId, gameId, key, data) {
//
//     let steamProfile = this._storage.getItem(steamId) || this._createSteamProfile();
//     let gameProfile = steamProfile[gameId] || this._createGameProfile();
//
//     gameProfile[key] = data;
//     steamProfile[gameId] = gameProfile;
//     this._storage.setItem(steamId, steamProfile);
//   }
//
//   get(steamId, gameId) {
//     const steamProfile = this._storage.getItem(steamId) || this._createSteamProfile();
//     return steamProfile[gameId] || this._createGameProfile();
//   }
//
//   _createSteamProfile() {
//     return {};
//   }
//   _createGameProfile() {
//     return {
//       tracked: [],
//     };
//   }
// }

