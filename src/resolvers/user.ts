import {IResolvers} from "@graphql-tools/utils";
import {ContextValue, T_user} from "../types";
import {onlyTitleRequested} from "./utils";
import {NS_USER} from "../mw";

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
        return ctx.pagesByName.load('User:' + u.user_name);
    }
};