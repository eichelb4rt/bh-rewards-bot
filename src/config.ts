import fs from 'fs';

export interface Config {
    os: string,
    mode: string,
    debug: boolean,
    headless: boolean,
}

export function readConfig(path: string): Config {
    return JSON.parse(fs.readFileSync(path, 'utf-8')) as Config;
}