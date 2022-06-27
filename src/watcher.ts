import fs from 'fs';
import { Browser, Frame } from "puppeteer";
import Cookies from "./cookies.js";
import { LoginPage } from "./login.js";
import { Reward } from './reward.js';
import { StreamPage } from "./stream.js";

export class Watcher {
    readonly #browser: Browser;
    readonly #username: string;
    readonly #password: string;
    #cookies: Cookies;
    #streamPage: StreamPage;
    #extensionFrame: Frame | null;

    constructor(browser: Browser, username: string, password: string) {
        this.#browser = browser;
        this.#username = username;
        this.#password = password;
    }

    async login() {
        let cookiesPath = `./cookies/cookies-${this.#username}.json`;
        this.#cookies = Cookies.readFromFile(cookiesPath);

        // If both cookies and a username are provided and the provided username does not match the username stored in the cookies, warn the user and prefer to use the one from the cookies.
        if (this.#cookies.exist() && this.#username.toLowerCase() != this.#cookies.getUsername().toLowerCase()) {
            console.log(`Provided username (${this.#username}) does not match the one found in the cookies (${this.#cookies.getUsername()})! Using the cookies to login...`);
        }

        if (!this.#cookies.exist()) {
            // if the cookies are invalid or don't exist, login again and save the cookies
            console.log("Logging in again.")
            const loginPage = new LoginPage(await this.#browser.newPage());
            this.#cookies = await loginPage.login(this.#username, this.#password);
            this.#cookies.save(cookiesPath);
        } else {
            console.log("Restoring cookies from last session.");
        }
    }

    async watch() {
        // start watching the stream
        const page = await this.#browser.newPage();
        await page.setViewport({
            width: 1920,
            height: 1080,
            deviceScaleFactor: 1,
        });
        // inject loaded cookies
        await this.#cookies.injectInto(page);
        // go on twitch
        await page.goto("https://www.twitch.tv/brawlhalla");
        await page.evaluate(() => {
            localStorage.setItem('mature', 'true');
            localStorage.setItem('video-muted', '{"default":true}');
            localStorage.setItem('video-quality', '{"default":"160p30"}');
        });
        // see who logged in
        let new_cookies = new Cookies(await page.cookies());
        await Cookies.waitForCookies(page, 30);
        console.log('Logged in as ' + new_cookies.login);
        // adjust stuff
        this.#streamPage = new StreamPage(page);
        await this.#streamPage.waitForLoad();
        await this.#streamPage.skipEmailVerification();

        // reload and wait until all the stuff has loaded in
        await page.reload({ waitUntil: ['networkidle2', 'domcontentloaded'] });
    }

    async hideVideo() {
        await this.#streamPage.hideVideoElements();
    }

    async isBlocked(): Promise<boolean> {
        return this.#streamPage.chatBanned();
    }

    async clickExtension() {
        await this.#streamPage.clickExtension();
        const extension_frame = await this.#streamPage.page.$("iframe.extension-view__iframe");
        const iframe_document = await this.#streamPage.page.evaluate(el => el.contentWindow.document, extension_frame);
        // console.log(iframe_document);
        // const iiframe = await iframe_document.$("iframe");
        // console.log(iiframe);
        // TODO: somehow get rewards inside document inside iframe inside document inside iframe
        console.log(iframe_document.constructor.name);
        this.#extensionFrame = await extension_frame.contentFrame();
    }

    async clickInventory() {
        if (!this.#extensionFrame) {
            console.log("Didn't click the extension yet! Returning...");
            return;
        }
        // console.log(this.#extensionFrame);
        // const tab = (await this.#extensionFrame.$x('//*[contains(text(), "Inventory")]'))[0];
        // await tab.click();
        await this.#extensionFrame.click("#react-tabs-2");
    }

    async readInventory(): Promise<Reward[]> {
        const reward_holders = await this.#extensionFrame.$$(".rewards-reward-holder");
        let rewards: Reward[] = []
        for (const reward_holder of reward_holders) {
            const reward_name_element = await reward_holder.$("rewards-reward-name");
            const reward_name = await this.#streamPage.page.evaluate(el => el.textContent, reward_name_element);
            const reward_code_element = await reward_holder.$("code-text");
            const reward_code = await this.#streamPage.page.evaluate(el => el.textContent, reward_code_element);
            rewards.push({
                code: reward_code,
                name: reward_name,
                claimed: false
            });
        }
        return rewards;
    }

    async saveInventory() {
        // const rewards = await this.#streamPage.page.$eval(".rewards-panel", (element) => {
        //     return element.innerHTML
        // });
        const rewards = await this.#streamPage.page.evaluate(() => document.body.innerHTML);
        fs.writeFileSync(`./inventories/inventory-${this.#username}.html`, rewards);
    }

    async stopWatching() {
        await this.#streamPage.page.close();
    }

    async screenshot() {
        await this.#streamPage.page.screenshot({
            fullPage: true,
            path: `./screenshots/screenshot-${this.#username}.png`
        });
    }
}