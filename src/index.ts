import puppeteer, { Browser, Page } from "puppeteer";
import { Config, readConfig } from "./config.js";
import { Cookies } from "./cookies.js";
import { Users } from "./users.js";
import { Watcher } from "./watcher.js";

async function main() {
	const config = readConfig('config.json');
	const executablePath = config.os === 'linux' ? "/usr/bin/google-chrome-stable" : "C:/Program Files/Google/Chrome/Application/chrome.exe";
	const browser = await puppeteer.launch({
		headless: config.headless,
		executablePath: executablePath
	});

	switch (config.mode) {
		case 'farm': await farm(browser, config); break;
		case 'harvest': await harvest(browser, config); break;
		case 'register': await register(browser, config); break;
		case 'login': await login(browser, config); break;
	}

	await browser.close();
}

async function farm(browser: Browser, config: Config) {
	const users = new Users();
	for (const user of users.users) {
		const watcher = new Watcher(browser, user.name, user.password);
		await watcher.login();
		await watcher.watch();
		console.log(`${user.name} watching.`);

		// don't want to wait for the screenshot
		if (config.debug) watcher.screenshot();
	}

	while (true) { /* keep watching */ }
}

async function register(browser: Browser, config: Config) {
	// TODO: register
}

async function login(browser: Browser, config: Config) {
	const users = new Users();
	for (const user of users.users) {
		// skip users where we already got the cookies
		const cookiesPath = `./cookies/cookies-${user.name}.json`;
		const cookies = Cookies.readFromFile(cookiesPath);
		if (cookies.exist()) continue;
		// login
		const watcher = new Watcher(browser, user.name, user.password);
		await watcher.login();
		// don't want to wait for the screenshot
		if (config.debug) watcher.screenshot();
	}
	console.log("All users logged in.");
}

async function harvest(browser: Browser, config: Config) {
	const users = new Users();
	for (const user of users.users) {
		const watcher = new Watcher(browser, user.name, user.password);
		await watcher.login();
		await watcher.watch();
		// TODO: harvest codes
		console.log(`${user.name} harvesting.`);

		// don't want to wait for the screenshot
		if (config.debug) watcher.screenshot();
	}
}

main();
