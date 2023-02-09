/**
 * The server
 * Listen message from the plugin
 */
chrome.runtime.onInstalled.addListener(injectEverywhere);
chrome.runtime.onMessage.addListener(onMessage);

/**
 * Listen the message...
 * @param message
 * @param sender
 * @param sendResponse
 */
function onMessage(message, sender, sendResponse) {
	switch(message){
		case 'up':
			activeTab(sender.tab.index, sender.tab.windowId, -1);
			break;
		case 'down':
			activeTab(sender.tab.index, sender.tab.windowId, 1);
			break;
	}
}

/**
 * Active a tab
 * @param tabIndex
 * @param windowId
 * @param delta
 */
async function activeTab(tabIndex, windowId, delta) {
	const tabs = await chrome.tabs.query({
		windowId: windowId
	});
	let tab = null
	for (let i = tabIndex + delta; i >= 0 && i < tabs.length; i += delta) {
		if (tabs[i].url) {
			tab = tabs[i]
			break;
		}
	}
	if (tab) {
		// active the tab
		chrome.tabs.update(tab.id, { active: true });

		// prevent context menu one time (when scrolled with right click, release the click open the context menu)
		chrome.scripting.executeScript({
			target: { tabId: tab.id },
			function: disableContextMenu
		});
	}
}

/**
 * On plugin install, inject the js on all opened tabs
 */
function injectEverywhere() {
	chrome.tabs.query({}, function(tabs) {
		for (let i= 0; i < tabs.length; i++) {
			chrome.scripting.executeScript({
				target: {tabId: tabs[i].id},
				files: ['main.js']
			});
		}
	});
}

function disableContextMenu() {
	window.addEventListener("contextmenu", preventOneContextMenuEvent);
}
