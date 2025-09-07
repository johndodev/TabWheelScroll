/**
 * Send message to the server (to background.js)
 */
window.addEventListener('wheel', function(e) {
    // alt or right click is pressed, we must scroll...
    console.log(e);

    if (e.altKey || e.buttons === 2) {
        // prevent the new active tab to actually scroll
        e.preventDefault();

        if (e.deltaY < 0) {
            chrome.runtime && chrome.runtime.sendMessage('up');
        } else if (e.deltaY > 0) {
            chrome.runtime && chrome.runtime.sendMessage('down');
        }
    }
}, { passive: false });
