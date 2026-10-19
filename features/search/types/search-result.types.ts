import { Url } from "next/dist/shared/lib/router/router";


export interface SearchResult {
    id:number;
    slug?: string;
    name: string;
    prices: {
        price: number;
    };
    images: {
        id:number;
        src:string;
    }[];
    permalink: Url;


}
