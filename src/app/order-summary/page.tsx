"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useProducts } from "@/hooks/useProducts";
import { usePrices } from "@/hooks/usePrices";
import { ProductModel } from "@/types/product";
import { Suspense } from "react";

function calcPrice(total: number, p1: number, p2: number, p3: number, p4: number) {
    if (total >= 5000) return total * p4;
    if (total >= 3000) return total * p3;
    if (total >= 1000) return total * p2;
    return total * p1;
}

function OrderSummaryContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { products } = useProducts();
    const { prices } = usePrices();

    const [copied, setCopied] = useState(false);

    // รับ quantities จาก query params
    const quantities: Record<string, number> = useMemo(() => {
        try {
            return JSON.parse(searchParams.get("quantities") ?? "{}");
        } catch {
            return {};
        }
    }, [searchParams]);

    const orderId = searchParams.get("orderId") ?? `ORD-${Date.now()}`;

    // จับคู่ product กับ quantity แล้วเรียง createdAt
    const orderItems = useMemo(() => {
        const entries = Object.entries(quantities)
            .filter(([, qty]) => qty > 0)
            .map(([id, qty]) => {
                const product = products.find((p) => p.id === id) ?? {
                    id,
                    name: "ไม่พบข้อมูลสินค้า",
                    imageUrl: "",
                    level: 0,
                    isBestSeller: false,
                    inStock: false,
                    type: 3,
                    createdAt: undefined,
                } as ProductModel;
                return { product, qty };
            });

        entries.sort((a, b) => {
            const aDate = a.product.createdAt?.getTime() ?? Infinity;
            const bDate = b.product.createdAt?.getTime() ?? Infinity;
            return aDate - bDate;
        });

        return entries;
    }, [quantities, products]);

    const totalItems = Object.values(quantities).reduce((a, b) => a + b, 0);
    const totalPrice = calcPrice(
        totalItems,
        prices.pd_price_1,
        prices.pd_price_2,
        prices.pd_price_3,
        prices.pd_price_4
    );

    const fmt = (n: number) => n.toLocaleString("th-TH");
    const fmtMoney = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 2 });

    function copyOrderId() {
        navigator.clipboard.writeText(orderId).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--bg)" }}>

            {/* Navbar */}
            <nav style={{
                background: "var(--brown)", borderBottom: "3px solid var(--primary)",
                padding: "0 20px", height: "56px", display: "flex",
                alignItems: "center", justifyContent: "space-between",
                flexShrink: 0, boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
            }}>
                <button
                    onClick={() => router.back()}
                    style={{
                        background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
                        color: "white", borderRadius: "8px", width: "36px", height: "36px",
                        cursor: "pointer", fontSize: "18px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                >←</button>

                <span style={{ fontFamily: "Prompt, sans-serif", fontWeight: 600, fontSize: "17px", color: "white" }}>
                    ✅ สั่งซื้อสำเร็จ
                </span>

                <div style={{ width: "36px" }} />
            </nav>

            {/* Content */}
            <div style={{ flex: 1, padding: "20px 16px", maxWidth: "680px", width: "100%", margin: "0 auto" }}>

                {/* Note */}
                <div style={{
                    background: "#fff8e6", border: "1px solid #fcd97a",
                    borderLeft: "4px solid var(--warning)", borderRadius: "8px",
                    padding: "9px 14px", marginBottom: "16px",
                    fontSize: "13px", color: "#92600a",
                    animation: "pulse 2s ease-in-out infinite",
                }}>
                    <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
                    ⚠️ <strong>โน๊ต:</strong> แคปหน้าจอหรือกดคัดลอก Order ID !
                </div>

                {/* Order ID Card */}
                <div style={{
                    background: "white", borderRadius: "12px",
                    border: "1px solid var(--border)",
                    padding: "16px 20px", marginBottom: "16px",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
                    gap: "12px",
                }}>
                    <div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 500 }}>
                            ORDER ID
                        </div>
                        <div style={{
                            fontFamily: "Prompt, sans-serif", fontWeight: 700,
                            fontSize: "16px", color: "var(--brown)",
                            wordBreak: "break-all",
                        }}>
                            {orderId}
                        </div>
                    </div>
                    <button
                        onClick={copyOrderId}
                        style={{
                            flexShrink: 0,
                            background: copied ? "var(--success)" : "var(--brown)",
                            color: "white", border: "none", borderRadius: "8px",
                            padding: "8px 16px", fontSize: "13px", fontWeight: 600,
                            fontFamily: "Sarabun, sans-serif", cursor: "pointer",
                            display: "flex", alignItems: "center", gap: "6px",
                            transition: "background 0.2s",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {copied ? "✓ คัดลอกแล้ว" : "📋 คัดลอก"}
                    </button>
                </div>

                {/* Order Items */}
                <div style={{
                    background: "white", borderRadius: "12px",
                    border: "1px solid var(--border)",
                    overflow: "hidden",
                    boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
                    marginBottom: "16px",
                }}>
                    {/* Header */}
                    <div style={{
                        background: "var(--brown)", padding: "12px 16px",
                        display: "grid", gridTemplateColumns: "32px 1fr auto",
                        gap: "10px", alignItems: "center",
                        fontSize: "12px", fontWeight: 600,
                        fontFamily: "Prompt, sans-serif", color: "white",
                    }}>
                        <div style={{ textAlign: "center" }}>#</div>
                        <div>สินค้า</div>
                        <div style={{ textAlign: "right" }}>จำนวน</div>
                    </div>

                    {/* Items */}
                    {orderItems.length === 0 ? (
                        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "14px" }}>
                            ไม่มีรายการสั่งซื้อ
                        </div>
                    ) : (
                        orderItems.map(({ product, qty }, index) => (
                            <div key={product.id} style={{
                                display: "grid", gridTemplateColumns: "32px 1fr auto",
                                gap: "10px", alignItems: "center",
                                padding: "10px 16px",
                                borderTop: index === 0 ? "none" : "1px solid var(--border)",
                                background: index % 2 === 0 ? "white" : "#fafaf8",
                            }}>
                                {/* ลำดับ */}
                                <div style={{
                                    textAlign: "center", fontSize: "12px",
                                    color: "var(--text-muted)", fontWeight: 500,
                                }}>
                                    {index + 1}
                                </div>

                                {/* ชื่อ + รูป */}
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                                    <div style={{
                                        width: "34px", height: "34px", flexShrink: 0,
                                        borderRadius: "50%", background: "var(--primary-light)",
                                        border: "1.5px solid var(--border)",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        overflow: "hidden",
                                    }}>
                                        {product.imageUrl ? (
                                            <img
                                                src={product.imageUrl} alt={product.name}
                                                style={{ width: "24px", height: "24px", objectFit: "contain" }}
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                            />
                                        ) : (
                                            <span style={{ fontSize: "14px" }}>☕</span>
                                        )}
                                    </div>
                                    <span style={{
                                        fontSize: "13px", fontWeight: 500, color: "var(--text)",
                                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                    }}>
                                        {product.name}
                                    </span>
                                </div>

                                {/* จำนวน */}
                                <div style={{
                                    textAlign: "right", fontSize: "14px",
                                    fontWeight: 700, color: "var(--brown)",
                                    fontFamily: "Prompt, sans-serif",
                                    whiteSpace: "nowrap",
                                }}>
                                    {fmt(qty)} ชิ้น
                                </div>
                            </div>
                        ))
                    )}

                    {/* Summary Row */}
                    {orderItems.length > 0 && (
                        <div style={{
                            borderTop: "2px solid var(--border)",
                            background: "var(--primary-light)",
                            padding: "14px 16px",
                        }}>
                            <div style={{
                                display: "flex", justifyContent: "space-between",
                                alignItems: "center", marginBottom: "6px",
                            }}>
                                <span style={{ fontSize: "13px", color: "var(--brown-mid)", fontWeight: 600 }}>
                                    จำนวนทั้งหมด
                                </span>
                                <span style={{
                                    fontSize: "15px", fontWeight: 700,
                                    color: "var(--danger)", fontFamily: "Prompt, sans-serif",
                                }}>
                                    {fmt(totalItems)} ชิ้น
                                </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "13px", color: "var(--brown-mid)", fontWeight: 600 }}>
                                    ราคารวม
                                </span>
                                <span style={{
                                    fontSize: "20px", fontWeight: 700,
                                    color: "var(--danger)", fontFamily: "Prompt, sans-serif",
                                }}>
                                    ฿{fmtMoney(totalPrice)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Thank you */}
                <div style={{
                    textAlign: "center", padding: "24px 0 16px",
                    color: "var(--text-muted)", fontSize: "13px", lineHeight: 1.8,
                }}>
                    <div style={{ fontSize: "18px", marginBottom: "4px" }}>🌷</div>
                    <div>THANK YOU FOR SUPPORTING</div>
                    <div style={{ fontWeight: 700, color: "var(--brown)", fontFamily: "Prompt, sans-serif" }}>
                        @V&apos;vee Claire
                    </div>
                </div>

            </div>
        </div>
    );
}

export default function OrderSummaryPage() {
    return (
        <Suspense fallback={
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
                <div style={{
                    width: "36px", height: "36px",
                    border: "3px solid var(--border)", borderTopColor: "var(--primary)",
                    borderRadius: "50%", animation: "spin 0.8s linear infinite",
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        }>
            <OrderSummaryContent />
        </Suspense>
    );
}