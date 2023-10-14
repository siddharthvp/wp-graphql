/**
 * Efficient interface to access db replica.
 * Automatically handles transient connection errors.
 */

import * as mysql from 'mysql2/promise';
import {getCredentials, log, onToolforge, sleep} from "./utils";
import * as conf from "./conf.json";

interface ToolforgePoolConnection extends mysql.PoolConnection {
    inactiveTimeout: NodeJS.Timeout;
}

class Db {
    pool: mysql.Pool;

    constructor(customOptions: mysql.PoolOptions = {}) {
        this.pool = mysql.createPool({
            host: onToolforge() ? conf.db.host : conf.db.tunnel.host,
            port: onToolforge() ? conf.db.port : conf.db.tunnel.port,
            database: conf.db.database,
            ...getCredentials('wp-graphql'),
            waitForConnections: true,
            connectionLimit: conf.db.connectionLimit,
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
        this.pool.on('release', (connection: ToolforgePoolConnection) => {
            connection.inactiveTimeout = setTimeout(() => {
                connection.destroy();
            }, conf.db.inactiveConnDestroyTimeout * 1000);
        });
        this.pool.on('acquire', function (connection: ToolforgePoolConnection) {
            clearTimeout(connection.inactiveTimeout);
        });

        return this;
    }

    async getConnection() {
        try {
            return await this.pool.getConnection();
        } catch (e) { // try again
            log(`[W] ${e.code}: retrying in ${conf.db.connRetryDelay} seconds...`);
            await sleep(conf.db.connRetryDelay * 1000);
            return await this.pool.getConnection();
        }
    }

    /**
     * @returns array of objects - each object represents a row
     */
    async query(...args: any[]): Promise<Array<Record<string, string | number | null>>> {
        console.log(args[0].replace(/\s+/g, ' ').trim());
        let conn = await this.getConnection();
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

    /**
     * To be called when use of db is over.
     * All in-progress queries are executed before a quit packet is sent to mysql server.
     */
    async end() {
        await this.pool.end();
    }
}

export interface SQLError extends Error {
    code: string;
    errno: number;
    fatal: boolean;
    sql: string;
    sqlState: string;
    sqlMessage: string;
}

export const db = new Db();
