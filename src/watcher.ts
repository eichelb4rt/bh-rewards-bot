import { Browser, Page } from "puppeteer";
import { Cookies } from "./cookies.js";
import { LoginPage } from "./login.js";
import { StreamPage } from "./stream.js";

export class Watcher {
    readonly #browser: Browser;
    readonly #username: string;
    readonly #password: string;
    #cookies: Cookies;
    #streamPage: StreamPage;

    constructor(browser: Browser, username: string, password: string) {
        this.#browser = browser;
        this.#username = username;
        this.#password = password;
    }

    async login() {
        let requireLogin = false;
        let cookiesPath = `./cookies/cookies-${this.#username}.json`;
        this.#cookies = Cookies.readFromFile(cookiesPath);

        // If both cookies and a username are provided and the provided username does not match the username stored in the cookies, warn the user and prefer to use the one from the cookies.
        if (this.#cookies.exist() && this.#username != this.#cookies.getUsername()) {
            console.log('Provided username does not match the one found in the cookies! Using the cookies to login...');
        }

        // if the cookies are invalid or don't exist, login again
        if (!this.#cookies.exist()) {
            requireLogin = true;
        }

        // login
        if (requireLogin) {
            const loginPage = new LoginPage(await this.#browser.newPage());
            this.#cookies = await loginPage.login(this.#username, this.#password);
        }

        // Save cookies
        if (requireLogin) {
            this.#cookies.save(cookiesPath);
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
        await page.goto("https://www.twitch.tv/nichtnilo");
        // see who logged in
        let new_cookies = new Cookies(await page.cookies());
        await Cookies.waitForCookies(page, 30);
        console.log('Logged in as ' + new_cookies.login);
        // adjust stuff
        this.#streamPage = new StreamPage(page);
        await this.#streamPage.waitForLoad();
        await this.#streamPage.skipEmailVerification();
        await this.#streamPage.setLowestStreamQuality();
        await this.#streamPage.expandChatColumn();

        // page.hover("[data-a-target=player-overlay-click-handler]");
        
        // const extension = await page.evaluate(() => {
        //     return document.querySelector(".extensions-dock-card__image");
        // });

        // console.log(extension);
    }

    async screenshot() {
        await this.#streamPage.page.screenshot({
            fullPage: true,
            path: `./screenshots/screenshot-${this.#username}.png`
        });
    }
}