import {IResolvers} from "@graphql-tools/utils";
import {ContextValue, T_page} from "../types";
import {mw, NS_CATEGORY, NS_FILE} from "../mw";
import {db} from "../db";
import {Title} from "../title";

export const Page: IResolvers<T_page, ContextValue> = {
    id: pg => pg.page_id,
    title: pg => new mw.Title(pg.page_title, pg.page_namespace).toText(),
    namespace: pg => pg.page_namespace,
    isRedirect: pg => Boolean(pg.page_is_redirect),
    length: pg => pg.page_len,
    description: async (pg, _, ctx) => {
        return ctx.descriptions.load(pg.page_id);
    },
    categories: async (pg, args, ctx, info) => {
        let categories = await db.query(`
                SELECT cl_to FROM categorylinks
                WHERE cl_from = ?
                LIMIT ?
            `, [pg.page_id, args.limit]);
        let titles = categories.map(c => new Title(NS_CATEGORY, c.cl_to as string));
        return ctx.pagesByTitle(info).loadMany(titles);
    },
    templates: async (pg, args, ctx, info) => {
        let templates = await db.query(`
                SELECT lt_namespace, lt_title FROM templatelinks
                LEFT JOIN linktarget ON lt_id = tl_target_id
                WHERE tl_from = ?
                LIMIT ?
            `, [pg.page_id, args.limit]);
        let titles = templates.map(t => new Title(t.lt_namespace as number, t.lt_title as string));
        return ctx.pagesByTitle(info).loadMany(titles)
    },
    links: async (pg, args, ctx, info) => {
        let links = await db.query(`
            SELECT pl_namespace, pl_title FROM pagelinks
            WHERE pl_from = ?
            LIMIT ?
        `, [pg.page_id, args.limit]);
        let titles = links.map(l => new Title(l.pl_namespace as number, l.pl_title as string));
        return ctx.pagesByTitle(info).loadMany(titles);
    },
    images: async (pg, args, ctx, info) => {
        let images = await db.query(`
            SELECT il_to FROM imagelinks
            WHERE il_from = ?
            LIMIT ?
        `, [pg.page_id, args.limit]);
        let titles = images.map(r => new Title(NS_FILE, r.il_to as string));
        return ctx.pagesByTitle(info).loadMany(titles);
    },
    externalLinks: async (pg, args) => {
        let links = await db.query(`
            SELECT el_to_domain_index, el_to_path FROM externallinks
            WHERE el_from = ?
            LIMIT ?
        `, [pg.page_id, args.limit]);
        return links.map(r => ({ domainIndex: r.el_to_domain_index, path: r.el_to_path }));
    },
    langlinks: async pg => {
        let langlinks = await db.query(`
            SELECT ll_lang, ll_title FROM langlinks
            WHERE ll_from = ?
        `, [pg.page_id]);
        return langlinks.map(r => r.ll_lang + ':' + r.ll_title);
    },
    iwlinks: async pg => {
        let iwlinks = await db.query(`
            SELECT iwl_prefix, iwl_title FROM iwlinks
            WHERE iwl_from = ?
        `, [pg.page_id]);
        return iwlinks.map(r => r.iwl_prefix + ':' + r.iwl_title);
    },
    pageprops: async pg => {
        let props = await db.query(`
            SELECT * FROM page_props
            WHERE pp_page = ?
        `, [pg.page_id]);
        return Object.fromEntries(props.map(r => [r.pp_propname, r.pp_value]));
    },
    backlinks: async (pg, args, ctx, info) => {
        let backlinks = await db.query(`
            SELECT * FROM pagelinks
            WHERE pl_namespace = ? AND pl_title = ?
            LIMIT ?
        `, [pg.page_namespace, pg.page_title, args.limit]);
        let ids = backlinks.map(p => p.pl_from) as number[];
        return ctx.pagesById(info).loadMany(ids);
    },
    transclusions: async (pg, args, ctx, info) => {
        let transclusions = await db.query(`
            SELECT * FROM templatelinks
            WHERE tl_target_id = (SELECT * FROM linktarget WHERE lt_namespace = ? AND lt_title = ?)
            LIMIT ?
        `, [pg.page_namespace, pg.page_title, args.limit]);
        let ids = transclusions.map(t => t.tl_from) as number[];
        return ctx.pagesById(info).loadMany(ids);
    },
    redirects: async (pg, args, ctx, info) => {
        let redirects = await db.query(`
            SELECT * FROM redirect
            WHERE rd_namespace = ? AND rd_title = ?
            LIMIT ?
        `, [pg.page_namespace, pg.page_title, args.limit]);
        let ids = redirects.map(r => r.rd_from) as number[];
        return ctx.pagesById(info).loadMany(ids);
    },
    fileUsage: async (pg, args, ctx, info) => {
        let imagelinks = await db.query(`
            SELECT * FROM imagelinks
            WHERE il_to = ?
            LIMIT ?
        `, [pg.page_title, args.limit]);
        let ids = imagelinks.map(r => r.il_from) as number[];
        return ctx.pagesById(info).loadMany(ids);
    },
    talkPage: async (pg, _, ctx, info) => {
        let title = mw.Title.makeTitle(pg.page_namespace, pg.page_title).getTalkPage();
        return ctx.pagesByTitle(info).load(new Title(title.namespace, title.title));
    },
    subjectPage: async (pg, _, ctx, info) => {
        let title = mw.Title.makeTitle(pg.page_namespace, pg.page_title).getSubjectPage();
        return ctx.pagesByTitle(info).load(new Title(title.namespace, title.title));
    },
    lastRevision: async (pg, _, ctx, info) => {
        return ctx.revisions(info).load(pg.page_latest);
    },
    revisions: async (pg, args) => {
        return db.query(`
            SELECT * FROM revision 
            WHERE rev_page = ?
            ORDER BY rev_timestamp DESC
            LIMIT ?
        `, [pg.page_id, args.limit]);
    },
};
