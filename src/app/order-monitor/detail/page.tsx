"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useProducts } from "@/hooks/useProducts";
import { usePrices } from "@/hooks/usePrices";

// ─── Types ───────────────────────────────────────────────────────────────────

interface OrderDoc {
    id: string;
    items: Record<string, number>;
    created_at?: Timestamp;
}

interface ProductEntry {
    id: string;
    name: string;
    imageUrl: string;
    level: number;
    createdAt?: Date;
    qty: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatThaiDate(date: Date): string {
    return date.toLocaleString("th-TH", {
        year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const orderId = searchParams.get("id");

    const { products } = useProducts();
    const { prices } = usePrices();

    const [order, setOrder] = useState<OrderDoc | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState("");

    // ── โหลด order ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!orderId) return;
        getDoc(doc(db, "orders", orderId)).then((snap) => {
            if (snap.exists()) {
                setOrder({
                    id: snap.id,
                    items: (snap.data().items as Record<string, number>) ?? {},
                    created_at: snap.data().created_at as Timestamp | undefined,
                });
            }
            setIsLoading(false);
        });
    }, [orderId]);

    // ── คำนวณราคา ────────────────────────────────────────────────────────────
    function calcPrice(total: number): number {
        if (total >= 5000) return total * prices.pd_price_4;
        if (total >= 3000) return total * prices.pd_price_3;
        if (total >= 1000) return total * prices.pd_price_2;
        return total * prices.pd_price_1;
    }

    // ── copy + toast ──────────────────────────────────────────────────────────
    function copyText(text: string, msg: string): void {
        navigator.clipboard.writeText(text);
        setToast(msg);
        setTimeout(() => setToast(""), 1800);
    }

    if (isLoading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
                <div style={{
                    width: "36px", height: "36px", border: "3px solid var(--border)",
                    borderTopColor: "var(--primary)", borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!order) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", color: "var(--text-muted)" }}>
                ไม่พบ Order นี้
            </div>
        );
    }

    const createdAt = order.created_at?.toDate();
    const totalItems = Object.values(order.items).reduce((a, b) => a + b, 0);
    const totalPrice = calcPrice(totalItems);

    // ── สร้าง product entries เรียงตาม createdAt ─────────────────────────────
    const productEntries: ProductEntry[] = Object.entries(order.items)
        .map(([id, qty]) => {
            const p = products.find((x) => x.id === id);
            return {
                id,
                name: p?.name ?? "ไม่พบข้อมูลสินค้า",
                imageUrl: p?.imageUrl ?? "",
                level: p?.level ?? 0,
                createdAt: p?.createdAt,
                qty,
            };
        })
        .sort((a, b) => {
            if (!a.createdAt && !b.createdAt) return 0;
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return a.createdAt.getTime() - b.createdAt.getTime();
        });

    // ── buildOrderText ────────────────────────────────────────────────────────
    function buildOrderText(): string {
        const lines: string[] = [];
        lines.push(`รหัส: ${order!.id}`);
        if (createdAt) lines.push(`วันที่: ${formatThaiDate(createdAt)}`);
        lines.push("\nรายการ:");
        productEntries.forEach((p, i) => {
            lines.push(`${i + 1}. ${p.name}  x${p.qty}`);
        });
        lines.push(`\nทั้งหมด: ${totalItems} ชิ้น`);
        lines.push(`ราคา: ${totalPrice.toFixed(2)} บาท`);
        lines.push("\n✅เรียบร้อยค่ะ\n⚠️รายการไหนไม่ครบแจ้งแม่ค้าได้เลยนะคะ");
        return lines.join("\n");
    }

    const doneText = "✅เรียบร้อยค่ะ\n⚠️รายการไหนไม่ครบแจ้งแม่ค้าได้เลยนะคะ";

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "Sarabun, sans-serif", display: "flex", flexDirection: "column" }}>

            {/* Navbar */}
            <nav style={{
                background: "var(--brown)", borderBottom: "3px solid var(--primary)",
                padding: "0 20px", height: "56px", display: "flex",
                alignItems: "center", justifyContent: "space-between",
                boxShadow: "0 2px 12px rgba(0,0,0,0.15)", flexShrink: 0,
            }}>


                <span style={{ fontFamily: "Prompt, sans-serif", fontWeight: 600, fontSize: "17px", color: "white" }}>
                    รายละเอียด
                </span>

                <div style={{ display: "flex", gap: "8px" }}>
                    {/* คัดลอกเรียบร้อย */}
                    <button
                        onClick={() => copyText(doneText, "คัดลอกเรียบร้อยแล้ว")}
                        title="เรียบร้อย"
                        style={navBtnStyle}
                    >✅</button>
                    {/* คัดลอกทั้งหมด */}
                    <button
                        onClick={() => copyText(buildOrderText(), "คัดลอกรายการทั้งหมดแล้ว")}
                        title="คัดลอกรายการทั้งหมด"
                        style={navBtnStyle}
                    >📋</button>
                </div>
            </nav>

            {/* Body */}
            <div style={{ flex: 1, padding: "16px", maxWidth: "760px", margin: "0 auto", width: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>

                {/* วันที่ + Order ID */}
                {createdAt && (
                    <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: "14px", color: "var(--brown)" }}>
                        วันที่สั่งซื้อ: {formatThaiDate(createdAt)}
                    </p>
                )}
                <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: "15px", color: "var(--brown)" }}>
                    Order ID: {order.id}
                </p>

                <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "0 0 12px" }} />

                {/* Grid สินค้า */}
                <div style={{
                    flex: 1, overflowY: "auto",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
                    gridAutoRows: "130px",   // ← เพิ่มบรรทัดนี้ กำหนดความสูงการ์ดตายตัว
                    gap: "10px",
                    paddingBottom: "8px",
                }}>
                    {productEntries.map((p) => (
                        <div
                            key={p.id}
                            onClick={() => copyText(p.name, `คัดลอก: ${p.name}`)}
                            style={{
                                background: "rgba(139,90,43,0.05)", borderRadius: "8px",
                                padding: "8px 6px", cursor: "pointer",
                                display: "flex", flexDirection: "column",
                                alignItems: "center", gap: "4px",
                                border: "1px solid var(--border)",
                                transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(139,90,43,0.12)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(139,90,43,0.05)"; }}
                        >
                            {p.imageUrl ? (
                                <img src={p.imageUrl} alt={p.name} width={36} height={36} style={{ objectFit: "cover", borderRadius: "4px" }} />
                            ) : (
                                <div style={{ width: 36, height: 36, background: "var(--border)", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>📦</div>
                            )}
                            <span style={{ fontSize: "11px", fontWeight: 600, textAlign: "center", color: "var(--brown)", lineHeight: 1.3, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {p.name}
                            </span>
                            <span style={{ fontSize: "11px", color: "#9ca3af" }}>Lv.{p.level}</span>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#2563eb" }}>x{p.qty}</span>
                        </div>
                    ))}
                </div>

                <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "12px 0" }} />

                {/* รวม + ราคา */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                    <span style={{ fontSize: "15px", fontWeight: 700, color: "#2563eb" }}>
                        รวมทั้งหมด: {totalItems.toLocaleString("th-TH")} ชิ้น
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--danger)" }}>
                            ราคา: {totalPrice.toFixed(2)} บาท
                        </span>
                        <button
                            onClick={() => copyText(`${totalPrice.toFixed(2)} บาทค่า 💖`, `คัดลอก: ${totalPrice.toFixed(2)} บาท`)}
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "15px", color: "var(--danger)" }}
                            title="คัดลอกราคา"
                        >📋</button>
                    </div>
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div style={{
                    position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
                    background: "#166534", color: "white", borderRadius: "8px",
                    padding: "10px 20px", fontSize: "13px", fontWeight: 600,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)", zIndex: 100,
                    fontFamily: "Sarabun, sans-serif",
                }}>
                    {toast}
                </div>
            )}
        </div>
    );
}

const navBtnStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
    color: "white", borderRadius: "8px", width: "36px", height: "36px",
    cursor: "pointer", fontSize: "16px", display: "flex",
    alignItems: "center", justifyContent: "center",
};