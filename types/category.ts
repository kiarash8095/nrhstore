import { Url } from "next/dist/shared/lib/router/router";

export interface Category {
    id: number;
    name: string;
    slug: string;
    parent: number;
    permalink: Url,

}