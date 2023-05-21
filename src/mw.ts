import {mwn} from "mwn";

export const mw = new mwn({
    apiUrl: 'https://en.wikipedia.org/w/api.php',
    userAgent: 'wp-graphql.toolforge.org (SD0001)'
});

export const NS_MAIN = 0;
export const NS_TALK = 1;
export const NS_SPECIAL = -1;
export const NS_FILE = 6;
export const NS_TEMPLATE = 10;
export const NS_CATEGORY = 14;
export const NS_PROJECT = 4;
export const NS_USER = 2;
export const NS_USER_TALK = 3;
export const NS_BOOK = 108;
export const NS_PORTAL = 100;
export const NS_MODULE = 828;
export const NS_MEDIAWIKI = 8;
export const NS_DRAFT = 118;
export const NS_HELP = 12;

