import puppeteer, { Browser, Page } from "puppeteer";
import Config from "./config.js";
import Cookies from "./cookies.js";
import { Users } from "./users.js";
import { Watcher } from "./watcher.js";

async function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
	const executablePath = Config.os === 'linux' ? "/usr/bin/google-chrome-stable" : "C:/Program Files/Google/Chrome/Application/chrome.exe";
	const browser = await puppeteer.launch({
		headless: Config.headless,
		executablePath: executablePath
	});

	switch (Config.mode) {
		case 'farm': await farm(browser); break;
		case 'harvest': await harvest(browser); break;
		case 'register': await register(browser); break;
		case 'login': await login(browser); break;
	}

	await browser.close();
}

async function farm(browser: Browser) {
	const users = new Users();
	for (const user of users.users) {
		// don't start blocked users (or users that don't exist yet)
		if (user.blocked || !user.registered) continue;
		// login and watch
		const watcher = new Watcher(browser, user.name, user.password);
		await watcher.login();
		await watcher.watch();
		if (await watcher.isBlocked()) {
			console.log(`Oh no! ${user.name} is blocked!`);
			user.blocked = true;
			users.save();
			await watcher.stopWatching();
			continue;
		}
		console.log("watching");
		await watcher.clickExtension();
		await watcher.clickInventory();
		await watcher.saveInventory();
		console.log(`${user.name} saved inventory.`);
	}
}

async function register(browser: Browser) {
	// TODO: register
}

async function login(browser: Browser) {
	const users = new Users();
	for (const user of users.users) {
		// skip users where we already got the cookies
		const cookiesPath = `./cookies/cookies-${user.name}.json`;
		const cookies = Cookies.readFromFile(cookiesPath);
		if (cookies.exist()) continue;
		// don't start users that don't exist yet
		if (!user.registered) continue;
		// login
		const watcher = new Watcher(browser, user.name, user.password);
		await watcher.login();
		// don't want to wait for the screenshot
		if (Config.debug) watcher.screenshot();
	}
	console.log("All users logged in.");
}

async function harvest(browser: Browser) {
	const users = new Users();
	for (const user of users.users) {
		// don't start users that don't exist yet
		if (!user.registered) continue;
		const watcher = new Watcher(browser, user.name, user.password);
		await watcher.login();
		await watcher.watch();
		// TODO: harvest codes
		console.log(`${user.name} harvesting.`);

		// don't want to wait for the screenshot
		if (Config.debug) watcher.screenshot();
	}
}

main();
