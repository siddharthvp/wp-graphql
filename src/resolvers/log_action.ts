import {IResolvers} from "@graphql-tools/utils/typings";
import {ContextValue, T_logging} from "../types";
import {onlyFieldsRequested} from "../loader-utils";

export const LogAction: IResolvers<T_logging, ContextValue> = {
    id: lg => lg.log_id,
    type: lg => lg.log_type,
    action: lg => lg.log_action,
    timestamp: lg => lg.log_timestamp,
    user: async (lg, _, ctx, info) => {
        if (onlyFieldsRequested(info, ['actorId'])) {
            return { actorId: lg.log_actor };
        }
        let actor = await ctx.actors.load(lg.log_actor);
        let userId = actor.actor_user;
        if (onlyFieldsRequested(info, ['id', 'actorId'])) {
            return { user_id: userId, actorId: lg.log_actor };
        }
        return ctx.usersById.load(userId);
    },
    page: async (lg, _, ctx, info) => {
        if (onlyFieldsRequested(info, ['id', 'namespace', 'title'])) {
            return {
                page_id: lg.log_page,
                page_namespace: lg.log_namespace,
                page_title: lg.log_title
            };
        }
        return ctx.pagesById(info).load(lg.log_page);
    },
    comment: async (lg, _, ctx, info) => {
        return ctx.comments.load(lg.log_comment_id);
    },
}
