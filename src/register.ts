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

    async grantPermissions() {
        // go to stream
        await this.page.goto("https://www.twitch.tv/brawlhalla/");
        // click extension
        await this.clickExtension();
        const iframe = await (await this.page.$("iframe.extension-view__iframe")).contentFrame();
        const iiframe = await (await iframe.$("iframe")).contentFrame();
        const extension_frame = iiframe;
        await extension_frame.click(".online-button");
        await this.clickFrameText(extension_frame, "Grant");
    }

    private async clickExtension() {
        // hover over the video so the extension is shown
        await this.page.waitForSelector("[data-a-target=player-overlay-click-handler]");
        await this.page.hover("[data-a-target=player-overlay-click-handler]");
        // click on the extension
        await this.page.waitForSelector(".extensions-dock-card__image", { timeout: 1000 });
        await this.click(".extensions-dock-card__image");
    }

    async close() {
        await this.page.close();
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
        return "bruh_habruhter_3000";
    }

    private static genPassword() {
        // TODO
        return "1n4i54u7ewqidn5s7a9k0j2d2";
    }
}