import loaders from "./loaders";

export type ContextValue = typeof loaders;

export type MWTimestamp = string;

export interface T_page {
    page_id: number
    page_namespace: number
    page_title: string
    page_is_redirect: number
    page_is_new: number
    page_random: number
    page_touched: MWTimestamp
    page_links_updated: MWTimestamp
    page_latest: number
    page_len: number
    page_content_model: string
    page_lang: string
}

export interface T_revision {
    rev_id: number
    rev_page: string
    rev_comment_id: number
    rev_actor: number
    rev_timestamp: MWTimestamp
    rev_minor_edit: number
    rev_deleted: number
    rev_len: number
    rev_parent_id: number
    rev_sha1: string
}

export interface T_user {
    user_id: number
    user_name: string
    user_real_name: string
    user_registration: MWTimestamp
    user_editcount: number
}

export interface T_comment {
    comment_id: number
    comment_hash: number
    comment_text: string
    comment_data: string
}

export interface T_actor {
    actor_id: number
    actor_user: number
    actor_name: string
}

export interface T_user_groups {
    ug_user: number
    ug_group: string
    ug_expiry: MWTimestamp
}

export interface T_category {
    cat_id: number
    cat_title: string
    cat_pages: number
    cat_subcats: number
    cat_files: number
}
