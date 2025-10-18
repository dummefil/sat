
onLoad(() => {
    const input = document.querySelector('#steamid-input');
    const button = document.querySelector('#steamid-login');

    button.addEventListener('click', async () => {
        const steamid = input.value;
        if (!steamid) return;
        const data = await api.post('login', { steamid: steamid });

        if (data.allowed) {
            const {steamid} = data;
            storage.set('steamid', steamid);
            location.href = `/dashboard?steamid=${steamid}`;
        }
    })
})