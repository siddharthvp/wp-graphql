import * as fs from "fs";

export async function sleep(millis: number) {
    return new Promise(resolve => setTimeout(resolve, millis));
}

export function log(message: string) {
    console.log(message);
}

let runningInToolforge;
export function onToolforge(): boolean {
    if (runningInToolforge !== undefined) {
        return runningInToolforge;
    }
    // See https://phabricator.wikimedia.org/T192244
    return runningInToolforge = fs.existsSync('/etc/wmcs-project');
}

const auth = require('../.auth.js');
export function getCredentials(account: string) {
    return auth[account];
}

export function nQuestionMarks(n: number, char = '?') {
    return Array(n).fill(char).join(',')
}
