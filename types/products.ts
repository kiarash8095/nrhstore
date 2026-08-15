
export interface Products {
    id:number;
    name: string;
    slug: string;
    images: {
        src: string,
    }[] | [];
    is_in_stock: boolean;
    parent: number;
    prices: {
        price: string;
        currency_decimal_separator: string;
    }
    permalink: string;
    review_count: number;
}