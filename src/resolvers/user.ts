import {IResolvers} from "@graphql-tools/utils";
import {ContextValue, T_user} from "../types";

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
    userPage: async (u, _, ctx) => {
        return ctx.pagesByName.load('User:' + u.user_name);
    }
};