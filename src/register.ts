// .online-button
// Text: "Grant"
"use strict";

import Cookies from "./cookies.js";
import { EmailPage } from "./emailpage.js";
import { TwitchPage } from "./page.js";
import { Scheduler } from "./schedule.js";
import { User, Users } from "./users.js";

const BIRTH_MONTH = "July";
const BIRTH_DAY = "30";
const BIRTH_YEAR = "1999";

export class RegisterPage extends TwitchPage {
    #created_user: User | null;

    async register(email_page: EmailPage): Promise<User> {
        // make 10 minute mail
        const email = await email_page.createMail()

        // clear cookies
        await Cookies.clear(this.page);

        // Go to signup page
        await this.page.goto("https://www.twitch.tv/");
        await this.clickText("Sign Up");
        await this.page.waitForSelector("[data-a-target=signup-username-input]");

        // type in username
        let username = RegisterPage.genUsername();
        await this.page.click("[data-a-target=signup-username-input]");
        await this.page.keyboard.type(username);

        // if the username is unavailable, generate a new one
        while (await this.usernameUnavailable()) {
            username = RegisterPage.genUsername();
            await this.page.click("[data-a-target=signup-username-input]");
            await this.clearTextField();
            await this.page.keyboard.type(username);
        }

        // type in password
        const password = RegisterPage.genPassword();
        await this.page.click("[data-a-target=signup-password-input]");
        await this.page.keyboard.type(password);
        await this.page.click("[data-a-target=signup-password-confirmation-input]");
        await this.page.keyboard.type(password);

        // type in date of birth
        await this.page.keyboard.press('Tab');
        await this.page.keyboard.press('Enter');
        await this.page.keyboard.type(BIRTH_MONTH);

        await this.page.click("[data-a-target=birthday-date-input]");
        await this.page.keyboard.type(BIRTH_DAY);

        await this.page.click("[data-a-target=birthday-year-input]");
        await this.page.keyboard.type(BIRTH_YEAR);

        // type in email
        await this.clickText("Use email instead");
        await this.page.click("[data-a-target=signup-email-input]");
        await this.page.keyboard.type(email);

        // click sign up
        // await this.page.click("[data-a-target=passport-signup-button]");
        const confirm_signup = await this.page.waitForXPath("//button[@data-a-target='passport-signup-button' and not(@disabled)]");
        await confirm_signup.click();

        // wait until we have to verify email / captcha is over
        await this.waitForEmailVerification();
        await this.clickText("Remind me later");

        // save user
        this.#created_user = {
            name: username,
            password: password,
            registered: true,
            blocked: false,
        };
        Users.add(this.#created_user);

        return this.#created_user;
    }

    public async saveCookies() {
        await Cookies.waitForCookies(this.page, 0);
        const cookies = new Cookies(await this.page.cookies());
        const cookiesPath = `./cookies/cookies-${this.#created_user.name}.json`;
        cookies.save(cookiesPath);
    }

    private async waitForEmailVerification() {
        while (!await this.hasText("Verify Your Email Address")) {
            await Scheduler.sleep(1000);
        }
    }

    private async usernameUnavailable(): Promise<boolean> {
        // TODO
        return false;
    }

    private static genUsername() {
        // TODO
        return "hardy_hater_3000";
    }

    private static genPassword() {
        // TODO
        return "dn5s7a9k0j2d21n4i54u7ewqi";
    }
}