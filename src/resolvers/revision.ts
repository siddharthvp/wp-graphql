import {IResolvers} from "@graphql-tools/utils";
import {ContextValue, T_revision} from "../types";
import {onlyFieldsRequested} from "./utils";

export const Revision: IResolvers<T_revision, ContextValue> = {
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