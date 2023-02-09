

async function main() {
    const form = document.getElementById('form');
    form.addEventListener('change', (event) => {
        const target = event.target;
        chrome.storage.sync.set({
            [target.name]: target.type === 'checkbox' ? target.checked : target.value
        });
    });

    const fieldNames = Object.getOwnPropertyNames(form.elements);
    const configs = await chrome.storage.sync.get(fieldNames);
    for (const name of fieldNames) {
        const ele = form.elements[name];
        const value = configs[name];
        if (ele.type === 'checkbox') {
            ele.checked = value;
        } else {
            ele.value = value;
        }
    }
}
main();