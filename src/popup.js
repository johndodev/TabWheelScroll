

async function main() {
    const form = document.getElementById('form');

    // Collect only named controls
    const namedControls = Array.from(form.elements).filter(el => !!el.name);
    const fieldNames = namedControls.map(el => el.name);

    // Apply defaults if nothing has been set yet
    const defaults = {
        jumpOverUnavailableTab: true,
        cyclicSwitchTab: true
    };

    // Load saved values and apply to UI
    const configs = Object.assign({}, defaults, await chrome.storage.sync.get(fieldNames));
    for (const el of namedControls) {
        const value = configs[el.name];
        if (el.type === 'checkbox') {
            el.checked = Boolean(value);
        } else if (value != null) {
            el.value = value;
        }
    }

    // Save changes
    form.addEventListener('change', (event) => {
        const target = event.target;
        if (!target.name) return;
        chrome.storage.sync.set({
            [target.name]: target.type === 'checkbox' ? target.checked : target.value
        });
    });
}
main();
