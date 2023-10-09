import {IResolvers} from "@graphql-tools/utils";
import {onlyIdRequested} from "./utils";
import {ContextValue, T_page} from "../types";
import {mw, NS_CATEGORY, NS_FILE} from "../mw";
import {db} from "../db";

export const Page: IResolvers<T_page, ContextValue> = {
    id: pg => pg.page_id,
    title: pg => new mw.title(pg.page_title, pg.page_namespace).toText(),
    isRedirect: pg => Boolean(pg.page_is_redirect),
    length: pg => pg.page_len,
    description: async (pg, _, ctx) => {
        return ctx.descriptions.load(pg.page_id);
    },
    categories: async pg => {
        let categories = await db.query(`
                SELECT cl_to FROM categorylinks
                WHERE cl_from = ?
            `, [pg.page_id]);
        return categories.map(c => mw.title.newFromText(c.cl_to as string, NS_CATEGORY)?.toText());
    },
    templates: async pg => {
        let templates = await db.query(`
                SELECT lt_namespace, lt_title FROM templatelinks
                LEFT JOIN linktarget ON lt_id = tl_target_id
                WHERE tl_from = ?
            `, [pg.page_id]);
        return templates.map(t => mw.title.newFromText(t.lt_title as string, t.lt_namespace as number)?.toText())
    },
    links: async pg => {
        let links = await db.query(`
            SELECT pl_namespace, pl_title FROM pagelinks
            WHERE pl_from = ?
        `, [pg.page_id]);
        return links.map(r => mw.title.makeTitle(r.pl_namespace as number, r.pl_title as string)
            .toText());
    },
    images: async pg => {
        let images = await db.query(`
            SELECT il_to FROM imagelinks
            WHERE il_from = ?
        `, [pg.page_id]);
        return images.map(r => mw.title.makeTitle(NS_FILE, r.il_to as string).toText());
    },
    externalLinks: async pg => {
        let links = await db.query(`
            SELECT el_to FROM externallinks
            WHERE el_from = ?
        `, [pg.page_id]);
        return links.map(r => r.el_to);
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
    backlinks: async (pg, _, ctx) => {
        let backlinks = await db.query(`
            SELECT * FROM pagelinks
            WHERE pl_namespace = ? AND pl_title = ?
        `, [pg.page_namespace, pg.page_title]);
        let ids = backlinks.map(r => r.rd_from) as number[];
        let pages = await ctx.pagesById.loadMany(ids);
        return pages.map(r => {
            if (r instanceof Error) return null;
            return mw.title.makeTitle(r.page_namespace as number, r.page_title as string).toText();
        });
    },
    transclusions: async (pg, _, ctx) => {
        let transclusions = await db.query(`
            SELECT * FROM templatelinks
            WHERE tl_target_id = (SELECT * FROM linktarget WHERE lt_namespace = ? AND lt_title = ?)
        `, [pg.page_namespace, pg.page_title]);
        let ids = transclusions.map(r => r.rd_from) as number[];
        let pages = await ctx.pagesById.loadMany(ids);
        return pages.map(r => {
            if (r instanceof Error) return null;
            return mw.title.makeTitle(r.page_namespace as number, r.page_title as string).toText();
        });
    },
    redirects: async (pg, _, ctx) => {
        let redirects = await db.query(`
            SELECT * FROM redirect
            WHERE rd_namespace = ? AND rd_title = ?
        `, [pg.page_namespace, pg.page_title]);
        let ids = redirects.map(r => r.rd_from) as number[];
        let pages = await ctx.pagesById.loadMany(ids);
        return pages.map(r => {
            if (r instanceof Error) return null;
            return mw.title.makeTitle(r.page_namespace as number, r.page_title as string).toText();
        });
    },
    fileUsage: async (pg, _, ctx) => {
        let imagelinks = await db.query(`
            SELECT * FROM imagelinks
            WHERE il_to = ?
        `, [pg.page_title]);
        let ids = imagelinks.map(r => r.rd_from) as number[];
        let pages = await ctx.pagesById.loadMany(ids);
        return pages.map(r => {
            if (r instanceof Error) return null;
            return mw.title.makeTitle(r.page_namespace as number, r.page_title as string).toText();
        });
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
        if (onlyIdRequested(info)) {
            return {rev_id: pg.page_latest};
        }
        return ctx.revisions.load(pg.page_latest);
    },
    revisions: async pg => {

    },
};