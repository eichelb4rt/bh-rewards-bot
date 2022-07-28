import fs from 'fs';
import { Watcher } from "./watcher.js";

function sanitize(date: string): string {
    return date.replace(/[\s:]/g, '_').replace(/,/g, '');
}

export default class DebugLog {
    private static log_filepath: string
    private static session_started: boolean = false;

    private static start_session() {
        if (this.session_started) {
            return;
        }
        const now = new Date();
        const now_str = sanitize(now.toUTCString());
        this.log_filepath = `./logs/${now_str}.log`;
        this.session_started = true;
    }

    public static logError(err: Error, time: string = null, watcher: Watcher = null) {
        this.start_session();
        const time_str = time ? ` at ${time}`: '';
        const watcher_str = watcher ? ` for ${watcher.user.name}`: '';
        const err_str = `Following error occured${time_str}${watcher_str}:\n${err.message}\n${err.stack}\n`;
        fs.appendFileSync(this.log_filepath, err_str);
    }

    public static log(msg: string, time: string = null, watcher: Watcher = null) {
        this.start_session();
        const time_str = time ? ` at ${time}`: '';
        const watcher_str = watcher ? ` from ${watcher.user.name}`: '';
        const err_str = `Message${watcher_str}${time_str}: ${msg}\n`;
        fs.appendFileSync(this.log_filepath, err_str);
    }
}