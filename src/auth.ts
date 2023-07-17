import fetch from 'node-fetch';

export default class Auth {
    readonly clientId: string;
    readonly clientSecret: string;

    constructor(clientId: string, clientSecret: string) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    private async generateNewToken() {
        const response = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${this.clientId}&client_secret=${this.clientSecret}&grant_type=client_credentials`, { method: "POST" });
        const response_body = JSON.parse(await response.text());
        if (response.status !== 200) {
            throw Error(`Something went wrong during authentication: ${response_body.message}.`)
        }
        return response_body.access_token;
    }

    async getToken() {
        // this could be done fancy with expiry stuff, but i don't give a shit anymore. this stuff is exhausting.
        return await this.generateNewToken();
    }
}