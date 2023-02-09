

async function main() {
    const form = document.getElementById('form');
    form.addEventListener('change', (event) => {
        const target = event.target;
        chrome.storage.sync.set({
            [target.name]: target.type === 'checkbox' ? target.checked : target.value
        });
    });

    // elements包含index的属性, 和以name命名的属性, 其中以name命名的属性是不可枚举的, 只能通过这种方式获取出来
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