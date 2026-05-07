/**
 * On plugin install, inject the js on all opened tabs
 * https://developer.chrome.com/docs/extensions/reference/api/runtime#event-onInstalled
 */
chrome.runtime.onInstalled.addListener(injectEverywhere);

/**
 * https://developer.chrome.com/docs/extensions/reference/api/runtime#event-onMessage
 */
chrome.runtime.onMessage.addListener(onMessage);

const previewTargets = new Map();

/** @returns {Promise<{cyclicSwitchTab: bool}>} */
async function getConfigs() {
	return chrome.storage.sync.get(['cyclicSwitchTab'])
}

function onMessage(message, sender) {
	const { action, direction, rightClick } = message;

	if (action === 'confirm') {
		confirmSwitch(sender.tab);
		return;
	}

	const delta = direction === 'up' ? -1 : 1;

	if (action === 'preview') {
		previewTab(sender.tab, delta);
	} else {
		// action === 'switch' or legacy message without action field
		activeTab(sender.tab, delta, rightClick);
	}
}

async function confirmSwitch(fromTab) {
	const targetId = previewTargets.get(fromTab.id);
	if (!targetId) return;
	previewTargets.delete(fromTab.id);
	await restoreTabFavicon(targetId);
	chrome.tabs.update(targetId, { active: true });
}

async function previewTab(fromTab, delta) {
	const configs = await getConfigs();
	const allTabs = await chrome.tabs.query({ windowId: fromTab.windowId });
	const tabs = allTabs.filter(t => !t.hidden && (!fromTab.workspaceId || t.workspaceId === fromTab.workspaceId));

	const currentPreviewId = previewTargets.get(fromTab.id);
	const startId = currentPreviewId ?? fromTab.id;
	const currentPos = tabs.findIndex(t => t.id === startId);
	if (currentPos === -1) return;

	let i = currentPos + delta;
	let skipped = 0;
	let tab = null;

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
		if (currentPreviewId && currentPreviewId !== tab.id) {
			restoreTabFavicon(currentPreviewId);
		}
		previewTargets.set(fromTab.id, tab.id);
		setTabPreviewFavicon(tab.id);
	}
}

const PREVIEW_FAVICON = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect width='16' height='16' rx='4' fill='%231a73e8'/><path d='M4 8h8M9 5l3 3-3 3' stroke='white' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>";

function setTabPreviewFavicon(tabId) {
	chrome.scripting.executeScript({
		target: { tabId },
		func: (iconUrl) => {
			if (!document.head) return;
			let link = document.querySelector('link[data-tab-preview]');
			if (!link) {
				link = document.createElement('link');
				link.rel = 'icon';
				link.setAttribute('data-tab-preview', '1');
				document.head.appendChild(link);
			}
			link.href = iconUrl;
		},
		args: [PREVIEW_FAVICON]
	}).catch(() => {});
}

function restoreTabFavicon(tabId) {
	return chrome.scripting.executeScript({
		target: { tabId },
		func: () => {
			const link = document.querySelector('link[data-tab-preview]');
			if (!link) return;
			// Setting href to empty data URL before removing forces Chrome to re-evaluate the favicon
			link.href = 'data:,';
			requestAnimationFrame(() => link.remove());
		}
	}).catch(() => {});
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
                    }).catch(() => {});
                }
            });
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
	if (!tab.url) return false;

	if (tab.status === 'unloaded') return true;

	// executeScript never settles on some pages (e.g. Chrome's XML viewer) — treat as unavailable
	const timeout = new Promise(resolve => setTimeout(() => resolve(false), 150));
	const check = chrome.scripting.executeScript({
		target: { tabId: tab.id },
		func: () => {}
	}).then(() => true, () => false);

	return Promise.race([check, timeout]);
}
