export interface ProductImage {
    id: number;
    src: string;
    name: string;
}

export interface ProductAttributes {
    name: string;
    id: number;
    taxonomy: string;
    terms: {
        name: string;
        id: number;
        slug: string;
    } [];
}
export interface Products {
    id:number;
    name: string;
    slug: string;
    description: string;
    images: ProductImage[];
    average_rating: string;
    is_in_stock: boolean;
    parent: number;
    prices: {
        price: string;
        currency_decimal_separator: string;
    }
    brands: {
        id:number;
        name: string;
        slug: string;
    } []
    permalink: string;
    categories:{
        id:number;
        name:string;
        slug:string;
    }[]
    review_count: number;
    attributes: ProductAttributes[];
}