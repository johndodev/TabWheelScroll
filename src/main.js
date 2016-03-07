/**
 * The Client, send message to the server (to background.js)
 */
if(chrome && chrome.runtime) {
    window.addEventListener('mousewheel', function(e) {
        // alt or right click is pressed, we must scroll...
        if (e.altKey || e.buttons == 2) {
            if (e.wheelDelta /120 > 0) {
                // to previous tab
                chrome.runtime.sendMessage('up');
            }
            else {
                // to next tab
                chrome.runtime.sendMessage('down');
            }
            e.preventDefault();
        }
    });

    /**
     * Prevent the context menu to show up after a scroll with the right click
     */
    function preventOneContextMenuEvent(e) {
        e.preventDefault();
        window.removeEventListener('contextmenu', preventOneContextMenuEvent);
    }
}
