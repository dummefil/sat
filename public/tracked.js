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

