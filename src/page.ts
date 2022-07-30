"use strict";

import puppeteer, { Frame, Page } from "puppeteer";
const TimeoutError = puppeteer.errors.TimeoutError;

export abstract class TwitchPage {

    readonly #page: Page;

    constructor(page: Page) {
        this.#page = page;
    }

    /**
     * Click the element specified by {@link selector} by calling its click() method. This is usually better than using
     * Puppeteer's Page.click() because Puppeteer attempts to scroll the page and simulate an actual mouse click,
     * which can fail if elements are displayed on top of it (for example popup dialogs).
     * @param selector
     */
    public async click(selector: string) {
        return this.#page.evaluate((_selector) => {
            document.querySelector(_selector).click();
        }, selector);
    }

    public async hasText(text: string) {
        try {
            await this.#page.waitForXPath(`//*[contains(text(), "${text}")]`, { timeout: 1000 });
            return true;
        } catch (err) {
            if (err instanceof TimeoutError) return false;
            console.log(err);
        }
    }

    get page(): Page {
        return this.#page;
    }

}

export async function frameHasText(frame: Frame, text: string) {
    try {
        await frame.waitForXPath(`//*[contains(text(), "${text}")]`, { timeout: 1000 });
        return true;
    } catch (err) {
        if (err instanceof TimeoutError) return false;
        console.log(err);
    }
}