import fs from 'fs';
import fetch from 'node-fetch';
import Auth from './auth.js';
import 'dotenv/config'

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
    #online: boolean = false;
    readonly #auth: Auth;

    constructor() {
        this.#auth = new Auth(process.env.CLIENT_ID, process.env.CLIENT_SECRET);
    }

    async timeUntilNextStream(): Promise<number> {
        const response = await fetch("https://teamup.com/ks53joip3zzxcsza3d/events", { method: "GET" });
        const responseJSON = JSON.parse(await response.text());
        console.log(responseJSON);
        return 5;
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
}