import DataLoader from "dataloader";
import {db} from "./db";
import {nQuestionMarks} from "./utils";
import {mw} from "./mw";
import {T_actor, T_page, T_revision, T_user, T_user_groups} from "./types";
import {GraphQLResolveInfo} from "graphql/type";
import {onlyFieldsRequested} from "./resolvers/utils";

/** One-to-one resorting */
function resort(keys, records, recordToKey) {
    let mapping = new Map();
    records.forEach(r => mapping.set(recordToKey(r), r));
    return keys.map(key => mapping.get(key));
}

/** One-to-many resorting */
function resortMultiple(keys, records, recordToKey) {
    let mapping = new Map();
    records.forEach(r => {
        let key = recordToKey(r);
        mapping.set(key, (mapping.get(key) || []).concat(r));
    });
    return keys.map(key => mapping.get(key));
}

/**
 * Avoid making a database query if only the key field is requested, which is already available.
 */
function optimise<K, V>(keyField: string, dbKeyField: string, info: GraphQLResolveInfo, loader: DataLoader<K, V>) {
    return {
        load: (key: K) => onlyFieldsRequested(info, [keyField]) ? { [dbKeyField]: key } : loader.load(key),
        loadMany: (keys: K[]) => onlyFieldsRequested(info, [keyField]) ? { [dbKeyField]: keys } : loader.loadMany(keys),
    }
}

export const descriptions = new DataLoader<number, string>(async ids => {
    const descriptions = await db.query(`
        SELECT page_id, pp_value FROM page
        LEFT JOIN page_props ON page_id = pp_page
        WHERE pp_propname = 'wikibase-shortdesc'
        AND page_id IN (${nQuestionMarks(ids.length)})
    `, ids);
    return resort(ids, descriptions, r => r.page_id).map(r => r.pp_value);
});

export const usersById = new DataLoader<number, T_user>(async ids => {
    const users = await db.query(`
        SELECT * FROM user
        WHERE user_id IN (${nQuestionMarks(ids.length)})
    `, ids);
    return resort(ids, users, u => u.user_id);
});

export const usersByName = new DataLoader<string, T_user>(async names => {
    const users = await db.query(`
        SELECT * FROM user
        WHERE user_name IN (${nQuestionMarks(names.length)})
    `, names);
    return resort(names, users, u => u.user_name);
});

export const pagesById = (info: GraphQLResolveInfo) =>
    optimise<number, T_page>('id', 'page_id', info, new DataLoader(async ids => {
        let pages = await db.query(`
            SELECT * FROM page
            WHERE page_id IN (${nQuestionMarks(ids.length)})
        `, ids);
        return resort(ids, pages, p => p.page_id);
    }));

export const pagesByName = new DataLoader<string, T_page>(async names => {
    let titles = names.map(name => mw.title.newFromText(name as string));
    let pages = await db.query(`
        SELECT * FROM page
        WHERE (page_namespace, page_title) IN (${nQuestionMarks(titles.length, '(?,?)')})
    `, titles.flatMap(t => [t.namespace, t.title]));
    return resort(titles.map(t => t.namespace + ':' + t.title), pages,
        p => p.page_namespace + ':' + p.page_title);
});

export const revisions = (info: GraphQLResolveInfo) =>
    optimise<number, T_revision>('id', 'rev_id', info, new DataLoader(async ids => {
        const revs = await db.query(`
            SELECT * FROM revision
            WHERE rev_id IN (${nQuestionMarks(ids.length)})
        `, ids);
        return resort(ids, revs, r => r.rev_id);
    }));

export const comments = new DataLoader<number, string>(async ids => {
    let comments = await db.query(`
        SELECT comment_id, comment_text 
        FROM comment
        WHERE comment_id IN (${nQuestionMarks(ids.length)})
    `, ids);
    return resort(ids, comments, c => String(c.comment_id)).map(c => c.comment_text);
});

export const actors = new DataLoader<number, T_actor>(async ids => {
    let actors = await db.query(`
        SELECT * FROM actor
        WHERE actor_id IN (${nQuestionMarks(ids.length)})
    `, ids);
    return resort(ids, actors, a => a.actor_id);
});

export const userGroups = new DataLoader<number, T_user_groups[]>(async ids => {
    let groups = await db.query(`
        SELECT * FROM user_groups
        WHERE ug_user IN (${nQuestionMarks(ids.length)})
    `, ids);
    return resortMultiple(ids, groups, g => g.ug_user);
});

export const revisionTags = new DataLoader<number, number[]>(async revIds => {
    let tagIds = await db.query(`
        SELECT ct_rev_id, ct_tag_id 
        FROM change_tag
        WHERE ct_rev_id IN (${nQuestionMarks(revIds.length)})
    `, revIds);
    return resortMultiple(revIds, tagIds, t => t.ct_rev_id).map(r => r?.map(t => t.ct_tag_id) || []);
});

export const tagNames = new DataLoader<number, string>(async ids => {
    let tags = await db.query(`
        SELECT ctd_id, ctd_name
        FROM change_tag_def
        WHERE ctd_id IN (${nQuestionMarks(ids.length)})
    `, ids);
    return resort(ids, tags, t => t.ctd_id).map(id => id.map(t => t.ctd_name));
});

export const categories = new DataLoader<string, string[]>(async names => {
    let cats = await db.query(`
        SELECT * FROM category
        WHERE cat_title IN (${nQuestionMarks(names.length)})
    `, names);
    return resort(names, cats, c => c.cat_title);
});

export const actorByUserId = new DataLoader<number, number>(async ids => {
    let actors = await db.query(`
        SELECT * FROM actor
        WHERE actor_user IN (${nQuestionMarks(ids.length)})
    `, ids);
    return resort(ids, actors, a => a.actor_user).map(a => a.actor_id);
});
