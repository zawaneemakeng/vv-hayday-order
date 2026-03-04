"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useProducts } from "@/hooks/useProducts";

export default function GenerateImagePage() {
    const router = useRouter();
    const { products, isLoading } = useProducts();

    const [inputValue, setInputValue] = useState("5");
    const [rowNumber, setRowNumber] = useState(5);

    const inStockProducts = products.filter((p) => p.inStock);

    function handleGenerate(): void {
        const parsed = parseInt(inputValue, 10);
        if (!parsed || parsed <= 0) return;
        const clamped = Math.min(parsed, 20);
        setRowNumber(clamped);
        setInputValue(String(clamped));
    }

    // ขนาด image + font ตาม rowNumber (ใช้ inline เพราะเป็น dynamic value)
    const imgSize = rowNumber <= 6 ? 42 : rowNumber <= 10 ? 30 : 22;
    const fontSize = rowNumber <= 6 ? 8 : rowNumber <= 10 ? 8 : 7;

    return (
        <div className="min-h-screen bg-[var(--bg)] font-[Sarabun,sans-serif]">

            {/* Navbar */}
            <nav className="bg-[var(--brown)] border-b-[3px] border-[var(--primary)] px-5 h-14 flex items-center justify-between shadow-md">

                <span className="font-[Prompt,sans-serif] font-semibold text-[17px] text-white">
                    🖼️ รูปภาพสินค้า
                </span>
                <div className="w-9" />
            </nav>

            <div className="max-w-[960px] mx-auto px-4 py-5">

                {/* Input + Button */}
                <div className="flex gap-2.5 items-center mb-6">
                    <input
                        type="number"
                        min={1}
                        max={20}
                        value={inputValue}
                        onChange={(e) => {
                            const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
                            setInputValue(v);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                        placeholder="Row Number (1-20)"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm text-center bg-white outline-none focus:border-[var(--primary)] transition-colors"
                    />
                    <button
                        onClick={handleGenerate}
                        className="px-6 py-2.5 rounded-lg bg-[var(--primary)] text-[var(--brown)] text-sm font-bold cursor-pointer whitespace-nowrap hover:opacity-90 transition-opacity"
                    >
                        Generate
                    </button>
                </div>

                {/* States */}
                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-9 h-9 border-[3px] border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin" />
                    </div>
                ) : inStockProducts.length === 0 ? (
                    <div className="text-center text-[var(--text-muted)] py-16 text-sm">
                        No products available
                    </div>
                ) : (
                    // gridTemplateColumns ต้องใช้ inline เพราะเป็น dynamic value
                    // กำหนด CSS variable ที่ root div
                    <div
                        className="grid gap-2"
                        style={{
                            gridTemplateColumns: `repeat(${rowNumber}, 1fr)`,
                            "--img-size": `${imgSize}px`,
                            "--lv-font": `${fontSize}px`,
                        } as React.CSSProperties}
                    >
                        {inStockProducts.map((product) => (
                            <div key={product.id} className="flex flex-col items-center gap-1">
                                {product.imageUrl ? (
                                    <img
                                        src={product.imageUrl}
                                        alt={product.name}
                                        className="object-cover rounded"
                                        style={{ width: "var(--img-size)", height: "var(--img-size)" }}
                                    />
                                ) : (
                                    <div
                                        className="bg-[var(--border)] rounded flex items-center justify-center text-xs"
                                        style={{ width: "var(--img-size)", height: "var(--img-size)" }}
                                    >
                                        📦
                                    </div>
                                )}
                                <div className="w-full text-center bg-amber-200/40 rounded-lg px-1">
                                    <span
                                        className="font-bold text-[var(--brown)] truncate block"
                                        style={{ fontSize: "var(--lv-font)" }}
                                    >
                                        Lv.{product.level}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}