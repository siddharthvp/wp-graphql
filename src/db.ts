/**
 * Efficient interface to access db replica.
 * Automatically handles transient connection errors.
 */

import * as mysql from 'mysql2/promise';
import {getCredentials, log, onToolforge, sleep} from "./utils";

const conf = {
    wikiDbHost: 'enwiki.analytics.db.svc.wikimedia.cloud',
    wikiDbPort: 3306,
    tunnelHost: '127.0.0.1',
    tunnelPort: 4711,
    connectionLimit: 10,
    inactiveConnDestroyTimeout: 5,
    connRetryDelay: 1,
}

abstract class Db {
    pool: mysql.Pool;

    protected constructor(customOptions: mysql.PoolOptions = {}) {
        this.pool = mysql.createPool({
            port: 3306,
            ...getCredentials('sdzerobot'),
            waitForConnections: true,
            connectionLimit: conf.connectionLimit,
            //timezone: 'Z',
            typeCast: function (field, next) {
                if (field.type === 'BIT' && field.length === 1) {
                    return field.buffer()[0] === 1;
                } else {
                    return next();
                }
            },
            ...customOptions
        });

        // Toolforge policy does not allow holding idle connections
        // Destroy connections on 5 seconds of inactivity. This avoids holding
        // idle connections and at the same time avoids the performance issue in
        // creating new connections for every query in a sequential set
        this.pool.on('release', (connection) => {
            connection.inactiveTimeout = setTimeout(() => {
                connection.destroy();
            }, conf.inactiveConnDestroyTimeout * 1000);
        });
        this.pool.on('acquire', function (connection) {
            clearTimeout(connection.inactiveTimeout);
        });

        return this;
    }

    async getConnection() {
        try {
            return await this.pool.getConnection();
        } catch (e) { // try again
            log(`[W] ${e.code}: retrying in ${conf.connRetryDelay} seconds...`);
            await sleep(conf.connRetryDelay * 1000);
            return await this.pool.getConnection();
        }
    }

    /**
     * @returns array of objects - each object represents a row
     */
    async query(...args: any[]): Promise<Array<Record<string, string | number | null>>> {
        let conn = await this.getConnection();
        console.log(args[0]);
        const result = await conn.query(...args).finally(() => {
            conn.release();
        });
        return result[0].map(row => {
            Object.keys(row).forEach(prop => {
                if (row[prop] instanceof Buffer) {
                    row[prop] = row[prop].toString();
                }
            });
            return row;
        });
    }

    async timedQuery(...args: any[]): Promise<[number, Array<Record<string, string | number | null>>]> {
        let startTime = process.hrtime.bigint();
        let queryResult = await this.query(...args);
        let endTime = process.hrtime.bigint();
        let timeTaken = Number(endTime - startTime) / 1e9;
        return [timeTaken, queryResult];
    }

    async run(...args: any[]) {
        // convert `undefined`s in bind parameters to null
        if (args[1] instanceof Array) {
            args[1] = args[1].map(item => item === undefined ? null : item);
        }
        let conn = await this.getConnection();
        return await conn.execute(...args).finally(() => {
            conn.release();
        });
    }

    /**
     * To be called when use of db is over.
     * All in-progress queries are executed before a quit packet is sent to mysql server.
     */
    async end() {
        await this.pool.end();
    }
}

class EnwikiDb extends Db {
    constructor(customOptions: mysql.PoolOptions = {}) {
        super({
            host: onToolforge() ? conf.wikiDbHost : conf.tunnelHost,
            port: onToolforge() ? conf.wikiDbPort : conf.tunnelPort,
            database: 'enwiki_p',
            ...customOptions
        });
    }

    // replagHours: number;
    // replagHoursCalculatedTime: MwnDate;
    //
    // async getReplagHours() {
    //     log('[V] Querying database lag');
    //     const lastrev = await this.query(`SELECT MAX(rev_timestamp) AS ts FROM revision`);
    //     const lastrevtime = new bot.date(lastrev[0].ts);
    //     this.replagHours = Math.round((Date.now() - lastrevtime.getTime()) / 1000 / 60 / 60);
    //     this.replagHoursCalculatedTime = new bot.date();
    //     return this.replagHours;
    // }
}

export interface SQLError extends Error {
    code: string;
    errno: number;
    fatal: boolean;
    sql: string;
    sqlState: string;
    sqlMessage: string;
}

export const db = new EnwikiDb();
