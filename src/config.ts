import fs from 'fs';

interface IConfig {
    os: string,
    mode: string,
    debug: boolean,
    headless: boolean,
}

function readConfig(path: string): IConfig {
    return JSON.parse(fs.readFileSync(path, 'utf-8')) as IConfig;
}

export default class Config {
    private static gotConfig: boolean = false;
    private static iconf: IConfig;

    private static read(path: string = "config.json") {
        if (this.gotConfig) return true;
        this.iconf = readConfig(path);
        this.gotConfig = true;
    }

    
    public static get os() : string {
        this.read();
        return this.iconf.os;
    }

    public static get mode() : string {
        this.read();
        return this.iconf.mode;
    }

    public static get debug() : boolean {
        this.read();
        return this.iconf.debug;
    }

    public static get headless() : boolean {
        this.read();
        return this.iconf.headless;
    }
    
    /**
     * Returns correct browser path based on selected OS.
     */
    public static get browserPath(): string {
        return Config.os === 'linux' ? "/usr/bin/google-chrome-stable" : "C:/Program Files/Google/Chrome/Application/chrome.exe";
    }
}