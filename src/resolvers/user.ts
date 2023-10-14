import {IResolvers} from "@graphql-tools/utils";
import {ContextValue, T_user} from "../types";
import {onlyTitleRequested} from "./utils";
import {NS_USER} from "../mw";
import {db} from "../db";
import {Title} from "../title";

export const User: IResolvers<T_user, ContextValue> = {
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
    userPage: async (u, _, ctx, info) => {
        if (onlyTitleRequested(info)) {
            return { page_namespace: NS_USER, page_title: u.user_name.replace(/ /g, '_') };
        }
        return ctx.pagesByTitle.load(new Title(NS_USER, u.user_name));
    },
    actorId: async (u, _, ctx) => {
        return u.actorId ?? (await ctx.actorByUserId.load(u.user_id));
    },
    contribs: async (u, args, ctx, info) => {
        return db.query(`
            SELECT * FROM revision_userindex
            WHERE rev_actor = (SELECT actor_id FROM actor WHERE actor_user = ?)
            ORDER BY rev_timestamp DESC
            LIMIT ?
        `, [u.user_id, args.limit]);
    },
    logs: async (u, args, ctx, info) => {
        return db.query(`
            SELECT * FROM logging_userindex
            WHERE log_actor = (SELECT actor_id FROM actor WHERE actor_user = ?)
            ORDER BY log_timestamp DESC
            LIMIT ?
        `, [u.user_id, args.limit]);
    },
};
