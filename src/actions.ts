import puppeteer, { Browser } from "puppeteer";
import Config from "./config.js";
import DebugLog from "./debuglog.js";
import { EmailPage } from "./emailpage.js";
import { RegisterPage } from "./register.js";
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
        const scheduler = Action.#config.scheduler;
        // save the end time of the current stream
        const streamEnd = Action.#config.currentStreamEnd;
        // wait (max time) until brawlhalla is online
        const success = await Action.waitUntilOnline();
        if (!success) return;
        // start farming
        let n_watchers = 0;
        const watchers = await this.login();
        for (const watcher of watchers) {
            // stop if brawl stopped streaming
            if (!await scheduler.isStreaming()) break;
            try {
                // watch stream
                await watcher.watch();
                // check if blocked
                if (await watcher.isBlocked()) {
                    console.log(`Oh no! ${watcher.user.name} is blocked!`);
                    watcher.user.blocked = true;
                    Users.save();
                    await watcher.stop();
                    continue;
                }
                // everything is fine, hide the video
                await watcher.hideVideo();
                ++n_watchers;
                console.log(`${watcher.user.name} is farming.`);
            } catch (e) {
                console.log(`${watcher.user.name} crashed.`);
                DebugLog.logError(e, "farming", watcher);
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
        DebugLog.log("All watchers stopped watching.");
    }

    async register() {
        // TODO: register
        // make 10-minute-mail, read address
        // click "Sign Up"
        // generate & fill in username, password
        // if "This username is unavailable.", generate new username
        // date of birth 30 07 1999
        // https://10minutemail.net/?lang=en
        // click "use email instead" if it's there
        // fill in email
        // click "Sign Up"
        // we're making sure you're not a bot...
        // wait on email
        Users.read();
        const email_page = new EmailPage(await this.browser.newPage());
        const register_page = new RegisterPage(await this.browser.newPage());
        const new_user = await register_page.register(email_page);
        console.log(new_user);
        while (true) {
            await Scheduler.sleep(5000);
        }
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
                DebugLog.logError(e, "login", watcher);
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
        const scheduler = Action.#config.scheduler;
        const watchers = await this.login();
        for (const watcher of watchers) {
            // stop if brawl stopped streaming
            if (!await scheduler.isStreaming()) break;
            try {
                await watcher.watch();
                // have to click before the video disappears
                await watcher.clickExtension();
                await watcher.hideVideo();
                // clicking inventory might fail
                const success = await watcher.clickInventory();
                if (!success) {
                    await watcher.stop();
                    continue;
                }
                // finall harvest
                console.log(`${watcher.user.name} harvesting.`);
                const rewards = await watcher.readInventory();
                Rewards.save(rewards);
            } catch (e) {
                console.log(`${watcher.user.name} crashed.`);
                DebugLog.logError(e, "harvesting", watcher);
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