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
	if (message === 'up') {
		const index = sender.tab.index - 1;

		if (index >= 0) {
			activeTab(index, sender.tab.windowId);
		}
	}

	if (message === 'down') {
		activeTab(sender.tab.index + 1, sender.tab.windowId);
	}
}

/**
 * Active a tab
 * @param tabIndex
 * @param windowId
 */
function activeTab(tabIndex, windowId) {
	let query = {
		'index': tabIndex,
		'windowId': windowId
	};

	chrome.tabs.query(query, function(tabs) {
		let tab = tabs[0] || null;

		if (tab) {
			// active the tab
			chrome.tabs.update(tab.id, {active:true});

			// prevent context menu one time (when scrolled with right click, release the click open the context menu)
			chrome.scripting.executeScript({
				target: {tabId: tab.id},
				function: disableContextMenu
			});
		}
	});
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
