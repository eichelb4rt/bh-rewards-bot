import fs from 'fs';
import { Watcher } from "./watcher.js";

function gen_logpath(): string {
    const now = new Date();
    return `./logs/${now.getFullYear()}_${now.getMonth() + 1}_${now.getDate()}-${now.getHours()}_${now.getMinutes()}.log`
}

function sanitize(date: string): string {
    return date.replace(/[\s:]/g, '_').replace(/,/g, '');
}

function current_time(): string {
    const now = new Date();
    return sanitize(now.toUTCString());
}

export default class DebugLog {
    private static readonly lastrun_path = "./logs/last_run.log"
    private static log_filepath: string
    private static session_started: boolean = false;

    private static start_session() {
        if (this.session_started) return;
        this.log_filepath = gen_logpath();
        this.session_started = true;
    }

    public static logError(err: Error, time: string = null, watcher: Watcher = null) {
        this.start_session();
        const time_str = time ? ` at ${time}` : '';
        const watcher_str = watcher ? ` for ${watcher.user.name}` : '';
        const err_str = `${current_time()}:\tFollowing error occured${time_str}${watcher_str}:\n${err.message}\n${err.stack}\n`;
        fs.appendFileSync(this.log_filepath, err_str);
        fs.appendFileSync(this.lastrun_path, err_str);
    }

    public static log(msg: string, time: string = null, watcher: Watcher = null) {
        this.start_session();
        const time_str = time ? ` at ${time}` : '';
        const watcher_str = watcher ? ` from ${watcher.user.name}` : '';
        const err_str = `${current_time()}:\tMessage${watcher_str}${time_str}: ${msg}\n`;
        fs.appendFileSync(this.log_filepath, err_str);
        fs.appendFileSync(this.lastrun_path, err_str);
    }
}