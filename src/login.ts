"use strict";

import fs from "fs";

import puppeteer from "puppeteer";
import { Cookies } from "./cookies.js";
const TimeoutError = puppeteer.errors.TimeoutError;

import { TwitchPage } from "./page.js";

export class LoginPage extends TwitchPage {

    async login(username?: string, password?: string, headless: boolean = false, timeout?: number) {
        if (timeout) {
            this.page.setDefaultTimeout(1000 * timeout);
        }

        // Throw an error if the page is closed for any reason
        const onPageClosed = () => {
            throw new Error("Page closed!");
        }
        this.page.on("close", onPageClosed);

        // Go to login page
        await this.page.goto("https://www.twitch.tv/login");

        // Enter username
        if (username !== undefined) {
            await this.page.focus("#login-username");
            await this.page.keyboard.type(username);
        }

        // Enter password
        if (password !== undefined) {
            await this.page.focus("#password-input");
            await this.page.keyboard.type(password);
        }

        // Click login button
        if (username !== undefined && password !== undefined) {
            await this.page.click('[data-a-target="passport-login-button"]');
        }

        if (headless) {
            while (true) {

                // Check for email verification code
                try {
                    console.log("Checking for email verification...");
                    await this.page.waitForXPath('//*[contains(text(), "please enter the 6-digit code we sent")]');
                    console.log("Email verification found.");

                    // Prompt user for code
                    let code = null;
                    while (true) {
                        // Prompt for input
                        console.log("Enter the code from the email or 'r' to resend the email.")
                        code = "TODO: SOMEHOW GET THE VERIFICATION CODE"
                        if (code === 'r') {
                            // Resend
                            const resendCodeButton = await this.page.waitForXPath("//button[contains(text(), 'Resend code')]");
                            if (resendCodeButton === null) {
                                console.log("Failed to resend code!");
                                continue;
                            }
                            console.log("Resent verification email");
                            await resendCodeButton.click();
                        } else {
                            break;
                        }
                    }

                    // Enter code
                    const first_input = await this.page.waitForXPath("(//input)[1]");
                    if (first_input == null) {
                        console.log("first_input was null!");
                        break
                    }
                    await first_input.click();
                    await this.page.keyboard.type(code);
                    break;
                } catch (error) {
                    if (error instanceof TimeoutError) {
                        console.log("Email verification not found.");
                    } else {
                        console.log(error);
                    }
                }

                // Check for 2FA code
                try {
                    console.log("Checking for 2FA verification...");
                    await this.page.waitForXPath('//*[contains(text(), "Enter the code found in your authenticator app")]');
                    console.log("2FA verification found.");

                    // Prompt user for code
                    const code = "TODO: SOMEHOW GET THE VERIFICATION CODE"

                    // Enter code
                    const first_input = await this.page.waitForXPath('(//input[@type="text"])');
                    if (first_input == null) {
                        console.log("first_input was null!");
                        break
                    }
                    await first_input.click();
                    await this.page.keyboard.type(code);

                    // Click submit
                    const button = await this.page.waitForXPath('//button[@target="submit_button"]');
                    if (button == null) {
                        console.log("button was null!");
                        break
                    }
                    await button.click();

                    break;
                } catch (error) {
                    if (error instanceof TimeoutError) {
                        console.log("2FA verification not found.");
                    } else {
                        console.log(error);
                    }
                }

                console.log("No extra verification found!");

                break;
            }

            // Wait for redirect to main Twitch page. If this times out then there is probably a different type of verification that we haven't checked for.
            try {
                await Cookies.waitForCookies(this.page, timeout);
            } catch (error) {
                if (error instanceof TimeoutError) {
                    const time = new Date().getTime();
                    const screenshotPath = "failed-login-screenshot-" + time + ".png";
                    const htmlPath = "failed-login-html-" + time + ".html";
                    console.log("Failed to login. There was probably an extra verification step that this app didn't check for."
                        + " A screenshot of the page will be saved to " + screenshotPath + ".");
                    await this.page.screenshot({
                        fullPage: true,
                        path: screenshotPath
                    });
                    fs.writeFileSync(htmlPath, await this.page.content());
                }
                throw error;
            }

        } else {
            await Cookies.waitForCookies(this.page, 0);
        }

        const cookies = new Cookies(await this.page.cookies());

        this.page.off("close", onPageClosed);
        await this.page.close();

        return cookies;
    }

}