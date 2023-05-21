import {mw, NS_CATEGORY, NS_FILE} from "./mw";
import {db} from "./db";
import {IResolvers} from "@graphql-tools/utils/typings";
import {ContextValue, T_actor, T_page, T_revision, T_user} from "./types";
import {mwTimestamp} from "./timestamp";

function onlyIdRequested(info) {
    return onlyFieldsRequested(info, ['id']);
}
function onlyFieldsRequested(info, fields: string[]) {
    const requestedFields = info.fieldNodes[0].selectionSet.selections
        .map(e => e.name.value);
    return requestedFields.every(field => fields.includes(field));
}

const Page: IResolvers<T_page, ContextValue> = {
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
            return { rev_id: pg.page_latest };
        }
        return ctx.revisions.load(pg.page_latest);
    },
    revisions: async pg => {

    },
};

const Revision: IResolvers<T_revision, ContextValue> = {
    id: r => {
        return r.rev_id
    },
    summary: async (r, args, ctx) => {
        return ctx.comments.load(r.rev_comment_id);
    },
    timestamp: r => r.rev_timestamp,
    length: r => r.rev_len,
    user: async (r, _, ctx, info) => {
        const actor = await ctx.actors.load(r.rev_actor);
        if (onlyFieldsRequested(info, ['id', 'name']) || !actor.actor_user) {
            // !actor.actor_user - in case of IPs where there is user_id or further user info
            return {
                user_id: actor.actor_user,
                user_name: actor.actor_name
            }
        }
        return ctx.usersById.load(actor.actor_user);
    },
    sha1: r => r.rev_sha1,
    isMinor: r => Boolean(r.rev_minor_edit),
    tags: async (r, _, ctx) => {
        let revTags = await ctx.revisionTags.load(r.rev_id);
        return await ctx.tagNames.loadMany(revTags);
    }
};

const User: IResolvers<T_user, ContextValue> = {
    id: u => u.user_id,
    name: u => u.user_name,
    editcount: u => u.user_editcount,
    registration: u => u.user_registration,
    groups: async (u, _, ctx) => {
        let groups = await ctx.userGroups.load(u.user_id);
        return groups.map(g => ({
            name: g.ug_group,
            expiry: g.ug_expiry
        }))
    },
    userPage: async (u, _, ctx) => {
        return ctx.pagesByName.load('User:' + u.user_name);
    }
};

const Query: IResolvers<any, ContextValue> = {
    async pages(parent, args, ctx) {
        if (args.ids) {
            return ctx.pagesById.loadMany(args.ids);
        } else if (args.titles) {
            return ctx.pagesByName.loadMany(args.titles);
        } else {
            throw new Error("ids or titles must be specified");
        }
    },

    async users(parent, args, ctx) {
        if (args.ids) {
            return ctx.usersById.loadMany(args.ids);
        } else if (args.names) {
            return ctx.usersByName.loadMany(args.names);
        } else {
            throw new Error("ids or names must be specified")
        }
    },

    async revisions(parent, args, ctx) {
        return ctx.revisions.loadMany(args.ids);
    }

}

export default {
    Timestamp: mwTimestamp,
    Page,
    Revision,
    User,
    Query,
}
