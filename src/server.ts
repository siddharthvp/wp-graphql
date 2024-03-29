import express from "express";
import cors from 'cors';
import * as fs from "fs/promises";
import * as path from "path";
import {ApolloServer} from "@apollo/server";
import {expressMiddleware} from '@apollo/server/express4';
import resolvers from "./resolvers";
import {mw} from "./mw";
import bodyParser from 'body-parser';
import * as loaders from "./loaders";
import {ContextValue} from "./types";
import {
    ApolloServerPluginLandingPageLocalDefault,
    ApolloServerPluginLandingPageProductionDefault
} from "@apollo/server/plugin/landingPage/default";

(async function () {

    const app = express();
    app.use(cors());
    app.use(bodyParser.json());

    const typeDefs = (await fs.readFile(__dirname + '/../schema.graphql')).toString();

    const server = new ApolloServer<ContextValue>({
        typeDefs,
        resolvers,
        introspection: true,
        plugins: [
            ApolloServerPluginLandingPageLocalDefault({
                embed: {
                    runTelemetry: false,
                    initialState: {
                        pollForSchemaUpdates: process.env.NODE_ENV !== 'production',
                    }
                }
            }),
        ],
    });

    await Promise.all([
        mw.getSiteInfo(),
        server.start(),
    ]);

    app.use('/graphql', expressMiddleware(server, {
        context: async () => {
            return {
                ...loaders
            }
        }
    }));

    app.use(express.static(path.join(__dirname, '../client')));

    const port = parseInt(process.env.PORT || '3000');

    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}/graphql`);
    });

})();
