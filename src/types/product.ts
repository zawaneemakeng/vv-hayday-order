export enum ProductType {
    food = 0,
    plant = 1,
    tool = 2,
    other = 3,
}

export interface ProductModel {
    id: string;
    name: string;
    type: ProductType;
    imageUrl: string;
    inStock: boolean;
    isBestSeller: boolean;
    level: number;
    createdAt?: Date;
}

export interface PriceSettings {
    pd_price_1: number;
    pd_price_2: number;
    pd_price_3: number;
    pd_price_4: number;
}