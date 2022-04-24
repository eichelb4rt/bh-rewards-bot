import puppeteer, { Page } from 'puppeteer';
import { Watcher } from './watcher.js';

(async () => {
    const browser = await puppeteer.launch();

    // const username = "justpetraslayer";
    // const password = "4EbJDI0uYkQxkKE0";
    const username = "brawlhallasuperfan1";
    const password = "g3ttingth33sportscolours";

    const watcher = new Watcher(browser, username, password);
    await watcher.login();
    await watcher.watch();

    await watcher.screenshot();

    await browser.close();
})();