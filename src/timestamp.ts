import {GraphQLScalarType, Kind} from 'graphql';
import {mw} from "./mw";

export const mwTimestamp = new GraphQLScalarType({
    name: 'Timestamp',
    description: 'Timestamp custom scalar type',

    // convert scalar's back-end representation for inclusion in operation response
    serialize(value) {
        // ISO timestamp without milliseconds
        return new mw.Date(value).toISOString().split('.')[0] + 'Z';
    },

    // convert value to backend representation
    parseValue(value) {
        return new mw.Date(value).format('YYYYMMDDHHmmss');
    },

    // convert value from query string to backend representation
    parseLiteral(ast) {
        if (ast.kind === Kind.STRING) {
            // Convert hard-coded AST string to integer and then to Date
            return new mw.Date(ast.value).format('YYYYMMDDHHmmss');
        }
        // Invalid hard-coded value (not an integer)
        return null;
    },
});
