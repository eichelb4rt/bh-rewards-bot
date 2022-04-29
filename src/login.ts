"use strict";

import { Cookies } from "./cookies.js";

import { TwitchPage } from "./page.js";

export class LoginPage extends TwitchPage {

    async login(username: string, password: string, timeout?: number) {
        if (timeout) {
            this.page.setDefaultTimeout(1000 * timeout);
        }

        // clear cookies
        await Cookies.clear(this.page);

        // Throw an error if the page is closed for any reason
        const onPageClosed = () => {
            throw new Error("Page closed!");
        }
        this.page.on("close", onPageClosed);

        // Go to login page
        await this.page.goto("https://www.twitch.tv/login");

        // Enter username
        await this.page.focus("#login-username");
        await this.page.keyboard.type(username);

        // Enter password
        await this.page.focus("#password-input");
        await this.page.keyboard.type(password);

        // Click login button
        await this.page.click('[data-a-target="passport-login-button"]');

        // prepare closing
        await Cookies.waitForCookies(this.page, 0);
        const cookies = new Cookies(await this.page.cookies());

        this.page.off("close", onPageClosed);
        await this.page.close();

        return cookies;
    }
}