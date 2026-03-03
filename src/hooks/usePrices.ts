"use client";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PriceSettings } from "@/types/product";

const DEFAULT: PriceSettings = {
    pd_price_1: 0.07,
    pd_price_2: 0.057,
    pd_price_3: 0.055,
    pd_price_4: 0.050,
};

export function usePrices() {
    const [prices, setPrices] = useState<PriceSettings>(DEFAULT);

    useEffect(() => {
        // ✅ collection "price" doc "settings" — ตรงกับ Flutter
        const unsubscribe = onSnapshot(doc(db, "price", "settings"), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setPrices({
                    pd_price_1: data["pd_price_1"] ?? DEFAULT.pd_price_1,
                    pd_price_2: data["pd_price_2"] ?? DEFAULT.pd_price_2,
                    pd_price_3: data["pd_price_3"] ?? DEFAULT.pd_price_3,
                    pd_price_4: data["pd_price_4"] ?? DEFAULT.pd_price_4,
                });
            }
        });
        return () => unsubscribe();
    }, []);

    return { prices };
}