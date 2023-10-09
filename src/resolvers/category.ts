import {IResolvers} from "@graphql-tools/utils/typings";
import {ContextValue, T_category} from "../types";
import {db} from "../db";
import {onlyIdRequested} from "./utils";

export const Category: IResolvers<T_category, ContextValue> = {
    id: c => c.cat_id,
    title: c => c.cat_title,
    counts: c => ({
        total: c.cat_files + c.cat_subcats + c.cat_pages,
        pages: c.cat_pages,
        subcats: c.cat_subcats,
        files: c.cat_files
    }),
    members: async (c, args, ctx, info) => {
        let pages = await db.query(`
            SELECT * FROM categorylinks
            WHERE cl_to = ?
            LIMIT ?
        `, [c.cat_title, args.limit]);
        if (onlyIdRequested(info)) {
            return pages.map(cl => ({ page_id: cl.cl_from }));
        }
        return ctx.pagesById.loadMany(pages.map(cl => cl.cl_from) as number[]);
    }
};
