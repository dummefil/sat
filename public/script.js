let steamId;
let gameId;
let storage;

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
  storage = new Storage();
  steamId = document.querySelector('.steamid').value;
  gameId = document.querySelector('.appid').value;
  const submitBtn = document.querySelector('.header-submit');
  submitBtn.addEventListener('click', submitHandler);

  const achivBlocks = document.querySelectorAll('.achiv');

  achivBlocks.forEach((achivBlock) => {
    achivBlock.addEventListener('click', trackAchievement);
    const id = achivBlock.dataset['id'];
    const note = storage.get(id);
    const inputNote = achivBlock.querySelector('.achiv-note');
    inputNote.addEventListener('change', saveNote)

    if (note) {
      inputNote.value = note;
    }
  })
});

function saveNote() {
  const id = this.dataset['id'];
  storage.set(id, this.value);
}

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
  return fetchRequest.json();
}

class Storage {
  #storage = localStorage;
  set(achievementId, data) {
    const token = this.#makeToken(steamId, gameId, achievementId)
    this.#storage.setItem(token, data);
  }

  get(achievementId) {
    const token = this.#makeToken(steamId, gameId, achievementId)
    return this.#storage.getItem(token);
  }

  #makeToken(steamId, gameId, achievementId) {
    return `${steamId}:${gameId}:${achievementId}`;
  }
}
