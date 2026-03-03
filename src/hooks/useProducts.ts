"use client";
import { useEffect, useState } from "react";
import { subscribeToProducts } from "@/services/productService";
import { ProductModel } from "@/types/product";

export function useProducts() {
    const [products, setProducts] = useState<ProductModel[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = subscribeToProducts((data: ProductModel[]) => {  // ✅ เพิ่ม type
            setProducts(data);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return { products, isLoading };
}