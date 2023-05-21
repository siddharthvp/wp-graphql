import express from "express";
import cors from 'cors';
import * as fs from "fs/promises";
import {ApolloServer} from "@apollo/server";
import {expressMiddleware} from '@apollo/server/express4';
import resolvers from "./resolvers";
import {mw} from "./mw";
import bodyParser from 'body-parser';
import loaders from "./loaders";
import {ContextValue} from "./types";

(async function () {

    const app = express();
    app.use(cors());
    app.use(bodyParser.json());

    const typeDefs = (await fs.readFile(__dirname + '/../schema.graphql')).toString();

    await mw.getSiteInfo();

    const server = new ApolloServer<ContextValue>({
        typeDefs,
        resolvers,
    });
    await server.start();

    app.use(expressMiddleware(server, {
        context: async () => {
            return {
                ...loaders
            }
        }
    }));

    const port = parseInt(process.env.PORT || '3000');

    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}/graphql`);
    });

})();
