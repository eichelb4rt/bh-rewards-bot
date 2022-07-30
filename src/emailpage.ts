import { Page } from "puppeteer";

export class EmailPage {
    readonly #page: Page;
    #email: string;

    constructor(page: Page) {
        this.#page = page;
    }

    async createMail(): Promise<string> {
        await this.#page.goto("https://10minutemail.net/?lang=en");
        this.#email = await this.#page.$eval(".mailtext", el => el.getAttribute("value"));
        return this.#email;
    }

    async close() {
        await this.#page.close();
    }

    async getVerificationCode(): Promise<string> {
        await this.#page.reload();
        const text_element = await this.getTextElement("Your Twitch Verification Code");
        const code_text = await this.#page.evaluate(el => el.textContent, text_element);
        return this.extractCode(code_text);
    }

    private extractCode(code_text: string): string {
        return code_text.split(' ')[0];
    }

    private async getTextElement(text: string) {
        return this.#page.waitForXPath(`//*[contains(text(), "${text}")]`, { timeout: 1000 });
    }


    public get email(): string {
        return this.#email;
    }

}