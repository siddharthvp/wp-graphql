import {IResolvers} from "@graphql-tools/utils/typings";
import {ContextValue, T_category} from "../types";

export const Category: IResolvers<T_category, ContextValue> = {
    id: c => c.cat_id,
    title: c => c.cat_title,
    counts: c => ({
        total: c.cat_files + c.cat_subcats + c.cat_pages,
        pages: c.cat_pages,
        subcats: c.cat_subcats,
        files: c.cat_files
    }),
};
