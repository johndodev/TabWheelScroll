async function main() {
    const form = document.getElementById('form');
    const warning = document.getElementById('noTriggerWarning');
    const defaults = { altWheelEnabled: true, rightClickWheelEnabled: true }; // keys not listed default to false (unchecked): cyclicSwitchTab, reverseScrollDirection

    function updateWarning() {
        const altEl = form.elements['altWheelEnabled'];
        const rightClickEl = form.elements['rightClickWheelEnabled'];
        warning.hidden = altEl.checked || rightClickEl.checked;
    }

    form.addEventListener('change', (event) => {
        const target = event.target;
        chrome.storage.sync.set({
            [target.name]: target.type === 'checkbox' ? target.checked : target.value
        });
        updateWarning();
    });

    const fieldNames = Object.getOwnPropertyNames(form.elements);
    const configs = await chrome.storage.sync.get(fieldNames);
    for (const name of fieldNames) {
        const ele = form.elements[name];
        if (ele.disabled) continue;
        const value = configs[name] ?? defaults[name];
        if (ele.type === 'checkbox') {
            ele.checked = value;
        } else {
            ele.value = value;
        }
    }

    updateWarning();
}
main();
