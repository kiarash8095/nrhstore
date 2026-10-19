export interface ProductImage {
    id: number;
    src: string;
    name: string;
}

export interface ProductAttributes {
    has_variations?: boolean;
    name: string;
    id: number;
    taxonomy: string;
    terms: {
        name: string;
        id: number;
        slug: string;
        default?: boolean;
    } [];
}
export interface Products {
    type?: string;
    is_purchasable?: boolean;
    has_options?: boolean;
    add_to_cart?: { minimum?: number; maximum?: number; multiple_of?: number };
    variations?: { id: number; attributes: { name: string; value: string }[] }[];
    id:number;
    name: string;
    slug: string;
    sku?: string;
    description: string;
    images: ProductImage[];
    average_rating: string;
    is_in_stock: boolean;
    parent: number;
    prices: {
        price: string;
        currency_code?: string;
        currency_minor_unit?: number;
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
