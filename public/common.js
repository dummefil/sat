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

  set(key, data) {
    this.#storage.setItem(key, data);
  }

  get(key) {
    return this.#storage.getItem(key);
  }
}

const onLoad = (cb) => {
  document.addEventListener('DOMContentLoaded', () => {
    cb();
  });
}

const storage = new Storage();
const api = {
  post: request
}
