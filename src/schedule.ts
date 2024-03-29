import fetch from 'node-fetch';
import Auth from './auth.js';
import 'dotenv/config'
import Action from './actions.js';
import { Set } from 'typescript';
import Config from './config.js';

// refresh online status every 10 minutes
export const ONLINE_REFRESH_INTERVAL = 10 * 60 * 1000;
// refresh schedule every 2 hours
const SCHEDULE_REFRESH_INTERVAL = 2 * 60 * 60 * 1000;
// ms in a week
const MS_IN_WEEK = 7 * 24 * 60 * 60 * 1000;

interface Event {
    id: string,
    start_time: string,
    end_time: string,
    title: string,
    canceled_until: string | null,
    category: { id: string, name: string } | null
}

/**
 * Checks Twitch GQL interface to see if user is streaming (using anonymous client id).
 * @param username The desired streamer.
 * @returns true if streaming, false if offline.
 */
export async function isStreaming(username: string): Promise<boolean> {
    // http POST request to the GQL interface
    const response = await fetch("https://gql.twitch.tv/gql", {
        method: "POST",
        body: JSON.stringify({
            "query": "query($login: String) {user(login: $login) {stream {id}}}",
            "variables": { "login": username }

        }),
        headers: {
            "Accept": 'application/json',
            "client-id": "kimne78kx3ncx6brgo4mv6wki5h1ko"
        }
    });

    // response in JSON
    const responseJSON = JSON.parse(await response.text());
    // if a stream object exists, we are streaming
    return responseJSON.data.user.stream != null;
}

export class Scheduler {
    readonly #auth: Auth;
    // is brawlhalla online or not
    #online: boolean = false;
    // point in time at which is has been updated
    #onlineLastUpdated: number;
    // set with start times of scheduled events
    #scheduled: Set<number>;

    constructor() {
        this.#auth = new Auth(process.env.CLIENT_ID, process.env.CLIENT_SECRET);
        this.#scheduled = new Set<number>();
    }

    /**
     * Starts a loop to schedule new actions every 2 hours.
     */
    startLoop() {
        // it's async, but the interval is so long, that we don't have to worry about it.
        this.scheduleActions();
        setInterval(() => this.scheduleActions(), SCHEDULE_REFRESH_INTERVAL);
    }

    /**
     * Retrieves planned streams and schedules actions to farm (and harvest) at the planned start point.
     */
    async scheduleActions() {
        // retrieve all events
        let events = await this.getEvents();
        const now = Date.now();
        // remove past events
        events = events.filter(event => new Date(event.end_time).getTime() >= now);
        // remove events that we already scheduled
        events = events.filter(event => !this.#scheduled.has(new Date(event.start_time).getTime()));
        // remove events that are further in the future than a week
        events = events.filter(event => new Date(event.start_time).getTime() - now < MS_IN_WEEK);

        // schedule only the nearest event
        if (events.length == 0) return;
        console.log(`${new Date()}: Retrieved ${events.length} future events. Scheduling nearest one.`);
        const scheduled_event = events[0];
        const start = new Date(scheduled_event.start_time);
        const end = new Date(scheduled_event.end_time);
        console.log(`- ${scheduled_event.title} at ${start}`);

        // say when it starts
        const distance_hours = (start.getTime() - now) / (1000 * 60 * 60);
        const distance_days = Math.floor(distance_hours / 24);
        const rest_hours = Math.round(10 * (distance_hours % 24)) / 10;
        if (distance_hours < 0) console.log("Event already started.");
        else console.log(`\t=> starting in ${distance_days} days and ${rest_hours} hours.`);

        // remember that we scheduled this event
        this.#scheduled.add(start.getTime());
        
        // schedule event
        setTimeout(() => {
            // when the time comes, the Action class is configured so that it knows when the current stream will end.
            Action.configure({ currentStreamEnd: end });
            // this is async, but we don't want to wait for it
            Action.autoExecute(Config.mode);
            // we can harvest "in parallel"
            // TODO: implement harvest properly for this to work
            // Action.autoExecute("harvest");
        }, Math.max(start.getTime() - now, 0));
        // remove the event from scheduled after it's over, just to clean up the set a bit
        setTimeout(() => this.#scheduled.delete(start.getTime()), Math.max(end.getTime() - now, 0));
    }

    async getEvents(): Promise<Event[]> {
        const token = `Bearer ${await this.#auth.getToken()}`;
        const response = await fetch("https://api.twitch.tv/helix/schedule?broadcaster_id=75346877", {
            method: "GET",
            headers: {
                "Accept": 'application/json',
                "client-id": this.#auth.clientId,
                "Authorization": token
            }
        });

        // response in JSON
        return JSON.parse(await response.text()).data.segments as Event[];
    }

    /**
     * Checks if brawlhalla is streaming. Online updates every 10 minutes.
     * @returns true if last known state is streaming, false otherwise.
     */
    async isStreaming(): Promise<boolean> {
        if (!this.#onlineLastUpdated || Date.now() - this.#onlineLastUpdated > ONLINE_REFRESH_INTERVAL) {
            this.#onlineLastUpdated = Date.now();
            this.#online = await isStreaming("brawlhalla");
        }
        return this.#online;
    }

    static async sleep(ms: number) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    static async sleepUntil(timestamp: number) {
        await this.sleep(Math.max(timestamp - Date.now(), 0));
    }
}