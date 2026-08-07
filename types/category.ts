import { Url } from "next/dist/shared/lib/router/router";

export interface Category {
    id: number;
    name: string;
    slug: string;
    parent: number;
    permalink: Url;
    image: {
        id: number;
        src: string;
        thumbnail: string;
        srcset: string;
        sizes: string;
        thumbnail_srcset: string;
        thumbnail_sizes: string;
        name: string;
        alt: string;

    };

}

export interface SubCategory {
    id: number;
    name: string;
    slug: string;
    parent: number;
}