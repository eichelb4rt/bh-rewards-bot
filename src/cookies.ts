import fs from 'fs';
import { Page } from "puppeteer";

export class Cookies {
    static readonly #requiredCookies = new Set(["auth-token", "persistent", "login"]);

    readonly #cookies: any;

    #oauthToken: string;
    #channelLogin: string;
    #login: string;

    constructor(cookies: any) {
        this.#cookies = cookies;
    }

    areValid() {
        return Cookies.cookieExists(this.#cookies, 'auth-token') && Cookies.cookieExists(this.#cookies, 'persistent');
    }

    getUsername() {
        for (const cookie of this.#cookies) {
            if (cookie['name'] === 'name' || cookie['name'] === 'login') {
                return cookie['value'];
            }
        }
    }

    exist() {
        return this.#cookies != null;
    }

    async injectInto(page: Page) {
        await page.setCookie(...this.#cookies);
    }

    static readFromFile(cookiesPath: string): Cookies {
        if (!fs.existsSync(cookiesPath)) return new Cookies(null);

        const jsonCookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));
        const cookies = new Cookies(jsonCookies);

        if (!cookies.areValid()) {
            // Saved cookies are invalid, let's delete them
            console.log('Saved cookies are invalid.')
            fs.unlinkSync(cookiesPath);
            return new Cookies(null);
        }

        console.log('Restoring cookies from last session.');
        return cookies;
    }

    save(cookiesPath: string) {
        fs.writeFileSync(cookiesPath, JSON.stringify(this.#cookies, null, 4));
        console.log('Saved cookies to ' + cookiesPath);
    }

    static async waitForCookies(page: Page, _timeout?: number) {
        // Maximum amount of time we should wait for the required cookies to be created. If they haven't been created within this time limit, consider the login a failure.
        const MAX_WAIT_FOR_COOKIES_SECONDS = _timeout ?? 30;

        // Wait until the required cookies have been created
        const startTime = new Date().getTime();
        while (true) {
            if (_timeout !== 0 && new Date().getTime() - startTime >= 1000 * MAX_WAIT_FOR_COOKIES_SECONDS) {
                throw new Error("Timed out while waiting for cookies to be created!");
            }

            const _cookies = await page.cookies();
            if (this.#allCookiesExist(_cookies)) break;

            console.log("Waiting for cookies to be created...");
            await page.waitForTimeout(3000);
        }
    }

    static cookieExists(cookies: any, name: string): boolean {
        for (const cookie of cookies) {
            if (cookie["name"] === name) {
                return true;
            }
        }
        return false;
    }

    static #allCookiesExist(cookies: any): boolean {
        for (const requiredCookie of this.#requiredCookies) {
            if (!this.cookieExists(cookies, requiredCookie)) return false;
        }
        return true;
    }


    public get cookies(): any {
        return this.#cookies;
    }


    public get oauthToken(): string {
        if (!this.#oauthToken) {
            for (const cookie of this.#cookies) {
                if (cookie['name'] == 'auth-token') {
                    this.#oauthToken = cookie['value'];
                    break;
                }
            }
        }
        return this.#oauthToken;
    }

    public get channelLogin(): string {
        if (!this.#channelLogin) {
            for (const cookie of this.#cookies) {
                if (cookie['name'] == 'persistent') {
                    this.#channelLogin = cookie['value'].split('%3A')[0];
                    break;
                }
            }
        }
        return this.#channelLogin;
    }

    public get login(): string {
        if (!this.#login) {
            for (const cookie of this.#cookies) {
                if (cookie['name'] == 'login') {
                    this.#login = cookie['value'];
                    break;
                }
            }
        }
        return this.#login;
    }
}