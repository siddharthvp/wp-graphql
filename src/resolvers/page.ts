import {IResolvers} from "@graphql-tools/utils";
import {onlyTitleRequested} from "./utils";
import {ContextValue, T_page} from "../types";
import {mw, NS_CATEGORY, NS_FILE} from "../mw";
import {db} from "../db";

export const Page: IResolvers<T_page, ContextValue> = {
    id: pg => pg.page_id,
    title: pg => new mw.title(pg.page_title, pg.page_namespace).toText(),
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
        if (onlyTitleRequested(info)) {
            return categories.map(c => ({ page_title: c.cl_to, page_namespace: NS_CATEGORY }));
        }
        let titles = categories.map(c => mw.title.newFromText(c.cl_to as string, NS_CATEGORY)?.toText());
        return ctx.pagesByName.loadMany(titles);
    },
    templates: async (pg, args, ctx, info) => {
        let templates = await db.query(`
                SELECT lt_namespace, lt_title FROM templatelinks
                LEFT JOIN linktarget ON lt_id = tl_target_id
                WHERE tl_from = ?
                LIMIT ?
            `, [pg.page_id, args.limit]);

        if (onlyTitleRequested(info)) {
            return templates.map(t => ({ page_title: t.lt_title, page_namespace: t.lt_namespace }));
        }
        let titles = templates.map(t => mw.title.newFromText(t.lt_title as string, t.lt_namespace as number)?.toText());
        return ctx.pagesByName.loadMany(titles)
    },
    links: async (pg, args, ctx, info) => {
        let links = await db.query(`
            SELECT pl_namespace, pl_title FROM pagelinks
            WHERE pl_from = ?
            LIMIT ?
        `, [pg.page_id, args.limit]);
        if (onlyTitleRequested(info)) {
            return links.map(l => ({ page_title: l.pl_title, page_namespace: l.pl_namespace }));
        }
        let titles = links.map(l => mw.title.makeTitle(l.pl_namespace as number, l.pl_title as string)
            .toText());
        return ctx.pagesByName.loadMany(titles);
    },
    images: async (pg, args, ctx, info) => {
        let images = await db.query(`
            SELECT il_to FROM imagelinks
            WHERE il_from = ?
            LIMIT ?
        `, [pg.page_id, args.limit]);
        if (onlyTitleRequested(info)) {
            return images.map(i => ({ page_title: i.il_to, page_namespace: NS_FILE }));
        }
        let titles = images.map(r => mw.title.makeTitle(NS_FILE, r.il_to as string).toText());
        return ctx.pagesByName.loadMany(titles);
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
    talkPage: async (pg, _, ctx) => {
        let title = mw.title.makeTitle(pg.page_namespace, pg.page_title).getTalkPage();
        return ctx.pagesByName.load(title.toText());
    },
    subjectPage: async (pg, _, ctx) => {
        let title = mw.title.makeTitle(pg.page_namespace, pg.page_title).getSubjectPage();
        return ctx.pagesByName.load(title.toText());
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
