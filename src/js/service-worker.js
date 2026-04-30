/**
 * On plugin install, inject the js on all opened tabs
 * https://developer.chrome.com/docs/extensions/reference/api/runtime#event-onInstalled
 */
chrome.runtime.onInstalled.addListener(injectEverywhere);

/**
 * https://developer.chrome.com/docs/extensions/reference/api/runtime#event-onMessage
 */
chrome.runtime.onMessage.addListener(onMessage);

/** @returns {Promise<{cyclicSwitchTab: bool}>} */
async function getConfigs() {
	return chrome.storage.sync.get(['cyclicSwitchTab'])
}

function onMessage(message, sender) {
	const { direction, rightClick } = message;
	const delta = direction === 'up' ? -1 : 1;
	activeTab(sender.tab, delta, rightClick);
}

async function activeTab(fromTab, delta, rightClick) {
	const configs = await getConfigs();
	const allTabs = await chrome.tabs.query({ windowId: fromTab.windowId });
	// Exclude hidden tabs and tabs from other workspaces (Opera exposes workspaceId on tabs)
	const tabs = allTabs.filter(t => !t.hidden && (!fromTab.workspaceId || t.workspaceId === fromTab.workspaceId));
	let tab = null;
	// Use array position (not tab.index) to handle gaps from filtered hidden tabs
	const currentPos = tabs.findIndex(t => t.id === fromTab.id);
	if (currentPos === -1) return;
	let i = currentPos + delta;
	let skipped = 0;

	while ((configs.cyclicSwitchTab || (i >= 0 && i < tabs.length)) && skipped < tabs.length) {
		const currentTab = tabs[(i + tabs.length) % tabs.length];
		if (await checkTabAvailable(currentTab)) {
			tab = currentTab;
			break;
		}
		i += delta;
		skipped++;
	}

	if (tab) {
		chrome.tabs.update(tab.id, { active: true });
		if (rightClick) {
			chrome.scripting.executeScript({
				target: { tabId: tab.id },
				func: disableContextMenu
			});
		}
	}
}

/**
 * On plugin install, inject the js on all opened tabs
 */
function injectEverywhere() {
	chrome.tabs.query({}, function (tabs) {
		for (let i = 0; i < tabs.length; i++) {
            if (tabs[i].status === 'unloaded') continue;

            checkTabAvailable(tabs[i]).then(available => {
                if (available) {
                    chrome.scripting.executeScript({
                        target: { tabId: tabs[i].id },
                        files: ['main.js']
                    });
                }
            })
		}
	});
}

function disableContextMenu() {
	function preventOnce(e) {
		e.preventDefault();
	}
	window.addEventListener("contextmenu", preventOnce, { once: true });
}

async function checkTabAvailable(tab) {
	console.log(tab);
	if (!tab.url) return false;

	// Unloaded tabs can't be scripted but can still be activated (they'll load on focus)
	if (tab.status === 'unloaded') return true;

	return await chrome.scripting.executeScript({
		target: { tabId: tab.id },
		func: noop
	}).catch(function(error) {
        return null;
    }) != null;
}

function noop() { }
