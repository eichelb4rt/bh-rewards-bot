import puppeteer, { Browser } from "puppeteer";
import Config from "./config.js";
import Cookies from "./cookies.js";
import { Rewards } from "./reward.js";
import { ONLINE_REFRESH_INTERVAL, Scheduler } from "./schedule.js";
import { Users } from "./users.js";
import { Watcher } from "./watcher.js";

// wait until the stream is online for a maximum of 2 hrs
const MAX_WAITING_TIME = 2 * 60 * 60 * 1000;

export interface ActionConfig {
    currentStreamEnd?: Date
    scheduler?: Scheduler
}

export default class Action {
    private readonly browser: Browser;
    static #config: ActionConfig = {
        // this is just so that a config exists, that we can overwrite
    };

    constructor(browser: Browser) {
        this.browser = browser;
    }

    /**
     * Configures parameters that the actions can use. E.g. the time, at which the current stream is ending.
     * @param config An object with the config parameters, that should be overwritten.
     */
    static configure(config: ActionConfig) {
        if (config.currentStreamEnd) {
            this.#config.currentStreamEnd = config.currentStreamEnd;
        }
        if (config.scheduler) {
            this.#config.scheduler = config.scheduler;
        }
    }

    /**
     * Executes an action with a new browser. Don't have to worry about handling the browser here.
     * @param mode the action to be executed.
     */
    static async autoExecute(mode: string = Config.mode) {
        const browser = await puppeteer.launch({
            headless: Config.headless,
            executablePath: Config.browserPath,
            args: [
                "--disable-web-security",
                "--disable-site-isolation-trials"
            ]
        });

        const action = new Action(browser);
        await action.autoAction(mode);

        await browser.close();
    }

    /**
     * Executes an action based on the given mode string.
     * @param mode string indicating what action should be executed.
     */
    async autoAction(mode: string = Config.mode) {
        switch (mode) {
            case 'farm': await this.farm(); break;
            case 'harvest': await this.harvest(); break;
            case 'register': await this.register(); break;
            case 'login': await this.login(); break;
            default: throw new Error(`"${mode}" is not a supported mode.`);
        }
    }

    /**
     * Starts Brawlhalla streams and farms for rewards (for every user).
     */
    async farm() {
        // save the end time of the current stream
        const streamEnd = Action.#config.currentStreamEnd;
        // wait (max time) until brawlhalla is online
        const success = await Action.waitUntilOnline();
        if (!success) return;
        // start farming
        let n_watchers = 0;
        const watchers = await this.login();
        for (const watcher of watchers) {
            try {
                await watcher.watch();
                if (await watcher.isBlocked()) {
                    console.log(`Oh no! ${watcher.user.name} is blocked!`);
                    watcher.user.blocked = true;
                    Users.save();
                    await watcher.stop();
                    continue;
                }
                await watcher.hideVideo();
                ++n_watchers;
                console.log(`${watcher.user.name} is farming.`);
            } catch (e) {
                console.log(`${watcher.user.name} crashed, but that's fine.`);
                await watcher.stop();
            }
        }
        console.log(`${n_watchers} watchers are farming.`);
        // wait until the end of stream and brawlhalla is offline
        await Scheduler.sleepUntil(streamEnd.getTime());
        await Action.waitUntilOffline();
        // close pages
        for (const watcher of watchers) {
            await watcher.stop();
        }
        console.log("All watchers stopped watching.");
    }

    async register() {
        // TODO: register
    }

    /**
     * Logs all users into Twitch.
     */
    async login(): Promise<Watcher[]> {
        const watchers = [];
        Users.read();
        for (const user of Users.users) {
            // don't start blocked users (or users that don't exist yet)
            if (!user.registered || user.blocked) continue;
            // login
            const watcher = new Watcher(this.browser, user);
            try {
                await watcher.login();
                watchers.push(watcher);
            } catch (e) {
                console.log(`${user.name} crashed while trying to log in.`);
                await watcher.stop();
            }
            // don't want to wait for the screenshot
            if (Config.debug) watcher.screenshot();
        }
        console.log(`${watchers.length} users logged in.`);
        return watchers;
    }

    /**
     * Starts brawlhalla streams and harvests the codes (for all users).
     */
    async harvest() {
        // TODO: wait (max time) until brawlhalla is offline
        Rewards.read();
        const watchers = await this.login();
        for (const watcher of watchers) {
            try {
                await watcher.watch();
                // have to click before the video disappears
                await watcher.clickExtension();
                await watcher.hideVideo();
                await watcher.clickInventory();
                console.log(`${watcher.user.name} harvesting.`);
                const rewards = await watcher.readInventory();
                Rewards.save(rewards);
            } catch (e) {
                console.log(`${watcher.user.name} crashed while trying to harvest.`);
            }
            await watcher.stop();
        }
    }

    private static async waitUntilOnline(): Promise<boolean> {
        const scheduler = this.#config.scheduler;
        const startWait = Date.now();
        while (!await scheduler.isStreaming()) {
            console.log(`${new Date()}: waiting until stream starts.`);
            Scheduler.sleep(ONLINE_REFRESH_INTERVAL);
            if (Date.now() - startWait > MAX_WAITING_TIME) {
                console.log(`${new Date()}: waiting failed because stream didn't start.`);
                return false;
            }
        }
        return true;
    }

    private static async waitUntilOffline() {
        const scheduler = this.#config.scheduler;
        while (!await scheduler.isStreaming()) {
            await Scheduler.sleep(ONLINE_REFRESH_INTERVAL);
        }
    }
}