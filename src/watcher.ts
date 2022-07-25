import fs from 'fs';
import { Browser, Frame } from "puppeteer";
import Cookies from "./cookies.js";
import ErrorLog from './errorlog.js';
import { LoginPage } from "./login.js";
import { Reward } from './reward.js';
import { StreamPage } from "./stream.js";
import { User } from './users.js';

export class Watcher {
    readonly #browser: Browser;
    readonly user: User;
    #cookies: Cookies;
    #streamPage: StreamPage;
    #extensionFrame: Frame | null;

    constructor(browser: Browser, user: User) {
        this.#browser = browser;
        this.user = user;
    }

    async login() {
        let cookiesPath = `./cookies/cookies-${this.user.name}.json`;
        this.#cookies = Cookies.readFromFile(cookiesPath);

        // If both cookies and a username are provided and the provided username does not match the username stored in the cookies, warn the user and prefer to use the one from the cookies.
        if (this.#cookies.exist() && this.user.name.toLowerCase() != this.#cookies.getUsername().toLowerCase()) {
            console.log(`Provided username (${this.user.name}) does not match the one found in the cookies (${this.#cookies.getUsername()})! Using the cookies to login...`);
        }

        if (!this.#cookies.exist()) {
            // if the cookies are invalid or don't exist, login again and save the cookies
            console.log("Logging in again.")
            const loginPage = new LoginPage(await this.#browser.newPage());
            this.#cookies = await loginPage.login(this.user.name, this.user.password);
            this.#cookies.save(cookiesPath);
        }

        // we don't need this page anymore after we logged in and saved the cookies
        await this.stop();
    }

    // true if success, false if failed
    async watch(): Promise<boolean> {
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
        console.log(`Logged in as ${new_cookies.login}`);
        // adjust stuff
        this.#streamPage = new StreamPage(page);
        // try loading stream
        try {
            await this.#streamPage.waitForLoad();
            // reload and wait until all the stuff has loaded in
            await page.reload({ waitUntil: ['networkidle2', 'domcontentloaded'] });
        } catch (e) {
            console.log(`${this.user.name}: Stream already stopped.`);
            return false;
        }
        // skip email if needed
        await this.#streamPage.skipEmailVerification();
        return true;
    }

    async stop() {
        if (!this.#streamPage) return;
        if (this.#streamPage.page.isClosed()) return;
        await this.#streamPage.page.close();
    }

    async hideVideo() {
        await this.#streamPage.hideVideoElements();
    }

    async isBlocked(): Promise<boolean> {
        return this.#streamPage.chatBanned();
    }
    // chromium-browser --disable-web-security
    // document.querySelector("iframe.extension-view__iframe").contentWindow.document
    async clickExtension() {
        await this.#streamPage.clickExtension();
        const iframe = await (await this.#streamPage.page.$("iframe.extension-view__iframe")).contentFrame();
        const iiframe = await (await iframe.$("iframe")).contentFrame();
        this.#extensionFrame = iiframe;
    }

    async clickInventory() {
        if (!this.#extensionFrame) {
            console.log("Didn't click the extension yet! Returning...");
            return;
        }
        await this.#extensionFrame.waitForSelector("#react-tabs-2");
        await this.#extensionFrame.click("#react-tabs-2");
    }

    async readInventory(): Promise<Reward[]> {
        await this.#extensionFrame.waitForSelector(".rewards-reward-holder");
        const reward_holders = await this.#extensionFrame.$$(".rewards-reward-holder");
        let rewards: Reward[] = []
        for (const reward_holder of reward_holders) {
            await reward_holder.waitForSelector(".rewards-reward-name");
            const reward_name_element = await reward_holder.$(".rewards-reward-name");
            const reward_name = await this.#extensionFrame.evaluate(el => el.textContent, reward_name_element);
            await reward_holder.waitForSelector("#code-text");
            const reward_code_element = await reward_holder.$("#code-text");
            const reward_code = await this.#extensionFrame.evaluate(el => el.textContent, reward_code_element);
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
        fs.writeFileSync(`./inventories/inventory-${this.user.name}.html`, rewards);
    }

    async screenshot() {
        await this.#streamPage.page.screenshot({
            fullPage: true,
            path: `./screenshots/screenshot-${this.user.name}.png`
        });
    }
}