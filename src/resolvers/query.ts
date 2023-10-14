import {IResolvers} from "@graphql-tools/utils";
import {ContextValue} from "../types";

export const Query: IResolvers<any, ContextValue> = {
    async pages(parent, args, ctx, info) {
        if (args.ids) {
            return ctx.pagesById(info).loadMany(args.ids);
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

    async revisions(parent, args, ctx, info) {
        return ctx.revisions(info).loadMany(args.ids);
    },

    async categories(parent, args, ctx) {
        return ctx.categories.loadMany(args.names);
    }

}
