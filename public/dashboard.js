function redirect () {
    const steamid = storage.get('steamid');
    const appid = this.dataset['appid'];
    location.href = `/?steamid=${steamid}&appid=${appid}`;
}

onLoad(() => {
    document.querySelectorAll('#btn-show-all-achievements').forEach(el => {
        el.addEventListener('click', redirect);
    })
})