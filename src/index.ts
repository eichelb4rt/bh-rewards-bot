import puppeteer, { Page } from "puppeteer";
import { Users } from "./users.js";
import { Watcher } from "./watcher.js";

(async () => {
	const browser = await puppeteer.launch({
		headless: true,
		// executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe"
		executablePath: "/usr/bin/google-chrome-stable"
	});

	const users = new Users();
	for (const user of users.users) {
		const watcher = new Watcher(browser, user.name, user.password);
		await watcher.login();
		await watcher.watch();
		console.log(`${user.name} watching.`);

		// don't want to wait for the screenshot
		watcher.screenshot();
	}

	while (true) { }

	await browser.close();
})();
