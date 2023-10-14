import {GraphQLResolveInfo} from "graphql/type";
import DataLoader from "dataloader";

/** One-to-one resorting */
export function resort(keys, records, recordToKey) {
    let mapping = new Map();
    records.forEach(r => mapping.set(recordToKey(r), r));
    return keys.map(key => mapping.get(key));
}

/** One-to-many resorting */
export function resortMultiple(keys, records, recordToKey) {
    let mapping = new Map();
    records.forEach(r => {
        let key = recordToKey(r);
        mapping.set(key, (mapping.get(key) || []).concat(r));
    });
    return keys.map(key => mapping.get(key));
}

export function onlyFieldsRequested(info, fields: string[]) {
    const requestedFields = info.fieldNodes[0].selectionSet.selections
        .map(e => e.name.value);
    return requestedFields.every(field => fields.includes(field));
}

/**
 * Avoid making a database query if only the key field is requested, which is already available.
 */
export function optimise<K, V>(keyField: string, dbKeyField: string, info: GraphQLResolveInfo, loader: DataLoader<K, V>) {
    return {
        load: (key: K) => onlyFieldsRequested(info, [keyField]) ?
            {[dbKeyField]: key} :
            loader.load(key),
        loadMany: (keys: K[]) => onlyFieldsRequested(info, [keyField]) ?
            keys.map(key => ({[dbKeyField]: key})) :
            loader.loadMany(keys),
    }
}

export function optimiseMulti<K, V>(keyFields: string[], dbKeyFields: string[], info: GraphQLResolveInfo, loader: DataLoader<K, V>) {
    const load = (key: K) => loadMany([key]);
    const loadMany = (keys: K[]) => {
        if (onlyFieldsRequested(info, keyFields)) {
            return keys.map(key => {
                let fields = Object.getOwnPropertyNames(key);
                return Object.fromEntries(
                    dbKeyFields.map((dbKeyField, idx) => {
                        return [dbKeyField, key[fields[idx]]];
                    })
                );
            });
        } else {
            return loader.loadMany(keys);
        }
    }
    return {load, loadMany};
}
