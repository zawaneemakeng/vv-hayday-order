"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
    collection, query, orderBy, onSnapshot,
    deleteDoc, doc, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useProducts } from "@/hooks/useProducts";
import { usePrices } from "@/hooks/usePrices";

// ─── Types ───────────────────────────────────────────────────────────────────

type FilterKey = "today" | "yesterday" | "7" | "14" | "30" | "all";

interface FilterOption {
    key: FilterKey;
    label: string;
}

interface OrderDoc {
    id: string;
    items: Record<string, number>;
    created_at?: Timestamp;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FILTERS: FilterOption[] = [
    { key: "today", label: "วันนี้" },
    { key: "yesterday", label: "เมื่อวาน" },
    { key: "7", label: "7 วัน" },
    { key: "14", label: "14 วัน" },
    { key: "30", label: "30 วัน" },
    { key: "all", label: "ทั้งหมด" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isInRange(date: Date, filter: FilterKey): boolean {
    const now = new Date();
    if (filter === "today") {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return date >= start;
    }
    if (filter === "yesterday") {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return date >= start && date < end;
    }
    if (filter === "7") return date >= new Date(Date.now() - 7 * 86_400_000);
    if (filter === "14") return date >= new Date(Date.now() - 14 * 86_400_000);
    if (filter === "30") return date >= new Date(Date.now() - 30 * 86_400_000);
    return true;
}

function formatThaiDate(date: Date): string {
    return date.toLocaleString("th-TH", {
        year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function OrderMonitorPage() {
    const router = useRouter();
    const { products } = useProducts();
    const { prices } = usePrices();

    const [orders, setOrders] = useState<OrderDoc[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<FilterKey>("today");
    const [searchQuery, setSearchQuery] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    // ── real-time listener ──────────────────────────────────────────────────
    useEffect(() => {
        const q = query(collection(db, "orders"), orderBy("created_at", "desc"));
        const unsub = onSnapshot(q, (snapshot) => {
            const data: OrderDoc[] = snapshot.docs.map((d) => ({
                id: d.id,
                items: (d.data().items as Record<string, number>) ?? {},
                created_at: d.data().created_at as Timestamp | undefined,
            }));
            setOrders(data);
            setIsLoading(false);
        });
        return () => unsub();
    }, []);

    // ── filter + search ─────────────────────────────────────────────────────
    const filtered = orders.filter((order) => {
        // กรองวันที่
        if (filter !== "all") {
            const date = order.created_at?.toDate();
            if (!date || !isInRange(date, filter)) return false;
        }
        // ค้นหา Order ID
        if (searchQuery.trim()) {
            return order.id === searchQuery.trim();
        }
        return true;
    });

    // ── คำนวณราคา ───────────────────────────────────────────────────────────
    function calcPrice(totalItems: number): number {
        if (totalItems >= 5000) return totalItems * prices.pd_price_4;
        if (totalItems >= 3000) return totalItems * prices.pd_price_3;
        if (totalItems >= 1000) return totalItems * prices.pd_price_2;
        return totalItems * prices.pd_price_1;
    }

    // ── ลบ order ─────────────────────────────────────────────────────────────
    async function handleDelete(id: string): Promise<void> {
        await deleteDoc(doc(db, "orders", id));
        setDeleteTarget(null);
    }

    // ── copy ──────────────────────────────────────────────────────────────────
    function copyText(text: string): void {
        navigator.clipboard.writeText(text);
    }

    const labelFilter = FILTERS.find((f) => f.key === filter)?.label ?? "";

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "Sarabun, sans-serif" }}>

            {/* Navbar */}
            <nav style={{
                background: "var(--brown)", borderBottom: "3px solid var(--primary)",
                padding: "0 20px", height: "56px", display: "flex",
                alignItems: "center", justifyContent: "space-between",
                boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
            }}>
                <span style={{ fontFamily: "Prompt, sans-serif", fontWeight: 600, fontSize: "17px", color: "white" }}>
                    📋 Order Monitor
                </span>
                <div style={{ width: 36 }} />
            </nav>

            <div style={{ maxWidth: "760px", margin: "0 auto", padding: "20px 16px" }}>

                {/* Search */}
                <div style={{ position: "relative", marginBottom: "16px" }}>
                    <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "16px" }}>🔍</span>
                    <input
                        ref={searchRef}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="ค้นหาด้วย Order ID"
                        style={{
                            width: "100%", padding: "10px 40px 10px 40px",
                            borderRadius: "10px", border: "1.5px solid var(--border)",
                            fontSize: "14px", fontFamily: "Sarabun, sans-serif",
                            background: "white", boxSizing: "border-box",
                            outline: "none",
                        }}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            style={{
                                position: "absolute", right: "10px", top: "50%",
                                transform: "translateY(-50%)", background: "none",
                                border: "none", cursor: "pointer", fontSize: "16px",
                                color: "var(--text-muted)",
                            }}
                        >✕</button>
                    )}
                </div>

                {/* Filter chips + count */}
                <div style={{ marginBottom: "16px" }}>
                    <p style={{ fontWeight: 700, fontSize: "15px", margin: "0 0 8px", color: "var(--brown)" }}>
                        {labelFilter} {filtered.length} ออเดอร์
                    </p>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {FILTERS.map((f) => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                style={{
                                    padding: "5px 14px", borderRadius: "20px", fontSize: "13px",
                                    cursor: "pointer", fontFamily: "Sarabun, sans-serif",
                                    border: `1.5px solid ${filter === f.key ? "var(--primary)" : "var(--border)"}`,
                                    background: filter === f.key ? "var(--primary)" : "white",
                                    color: filter === f.key ? "var(--brown)" : "var(--text-muted)",
                                    fontWeight: filter === f.key ? 700 : 400,
                                    transition: "all 0.15s",
                                }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                <hr style={{ border: "none", borderTop: "1px solid var(--border)", marginBottom: "16px" }} />

                {/* Order List */}
                {isLoading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
                        <div style={{
                            width: "36px", height: "36px", border: "3px solid var(--border)",
                            borderTopColor: "var(--primary)", borderRadius: "50%",
                            animation: "spin 0.8s linear infinite",
                        }} />
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)", fontSize: "15px" }}>
                        ยังไม่มีคำสั่งซื้อ
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {filtered.map((order) => {
                            const createdAt = order.created_at?.toDate();
                            const totalItems = Object.values(order.items).reduce((a, b) => a + b, 0);
                            const totalPrice = calcPrice(totalItems);

                            return (
                                <div
                                    key={order.id}
                                    onClick={() => router.push(`/order-monitor/detail?id=${order.id}`)}
                                    style={{
                                        background: "white", borderRadius: "12px",
                                        border: "1px solid var(--border)", padding: "16px",
                                        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                                        cursor: "pointer",
                                    }}
                                >
                                    {/* Order ID row */}
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                                        <span style={{ fontSize: "14px", color: "#7c3aed", fontWeight: 600 }}>
                                            Order ID: {order.id}
                                        </span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); copyText(order.id); }}
                                            title="คัดลอก Order ID"
                                            style={iconBtnStyle}
                                        >📋</button>
                                    </div>

                                    {/* วันที่ */}
                                    {createdAt && (
                                        <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 700, color: "var(--brown)" }}>
                                            วันที่สั่งซื้อ: {formatThaiDate(createdAt)}
                                        </p>
                                    )}

                                    {/* รายการสินค้า */}
                                    <div style={{ marginBottom: "10px" }}>
                                        {Object.entries(order.items).map(([productId, qty]) => {
                                            const name = products.find((p) => p.id === productId)?.name ?? productId;
                                            return (
                                                <p key={productId} style={{ margin: "2px 0", fontSize: "13px", color: "var(--text-muted)" }}>
                                                    สินค้า: {name} (x{qty})
                                                </p>
                                            );
                                        })}
                                    </div>

                                    <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "8px 0" }} />

                                    {/* รวม + ราคา + ลบ */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                                        <span style={{ fontSize: "14px", fontWeight: 700, color: "#2563eb" }}>
                                            รวม: {totalItems.toLocaleString("th-TH")} ชิ้น
                                        </span>

                                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                            <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--danger)" }}>
                                                ราคา: {totalPrice.toFixed(2)} บาท
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    copyText(`${totalPrice.toFixed(2)} บาทค่า 💖`);
                                                }}
                                                title="คัดลอกราคา"
                                                style={{ ...iconBtnStyle, color: "var(--danger)" }}
                                            >📋</button>
                                        </div>

                                        <button
                                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(order.id); }}
                                            style={{
                                                background: "none", border: "none",
                                                cursor: "pointer", fontSize: "18px",
                                                color: "#ef4444",
                                            }}
                                            title="ลบออเดอร์"
                                        >🗑️</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Delete Confirm Dialog */}
            {deleteTarget && (
                <div style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 50,
                }}>
                    <div style={{
                        background: "white", borderRadius: "14px", padding: "24px",
                        width: "320px", boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                        fontFamily: "Sarabun, sans-serif",
                    }}>
                        <h3 style={{ margin: "0 0 10px", fontFamily: "Prompt, sans-serif", fontSize: "17px", color: "var(--brown)" }}>
                            ยืนยันการลบ
                        </h3>
                        <p style={{ margin: "0 0 20px", fontSize: "14px", color: "var(--text-muted)" }}>
                            คุณแน่ใจหรือไม่ว่าต้องการลบ Order นี้?
                        </p>
                        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                            <button
                                onClick={() => setDeleteTarget(null)}
                                style={{
                                    padding: "8px 18px", borderRadius: "8px", fontSize: "14px",
                                    border: "1.5px solid var(--border)", background: "white",
                                    cursor: "pointer", fontFamily: "Sarabun, sans-serif",
                                }}
                            >ยกเลิก</button>
                            <button
                                onClick={() => handleDelete(deleteTarget)}
                                style={{
                                    padding: "8px 18px", borderRadius: "8px", fontSize: "14px",
                                    border: "none", background: "#ef4444",
                                    color: "white", cursor: "pointer",
                                    fontFamily: "Sarabun, sans-serif", fontWeight: 700,
                                }}
                            >ลบ</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const navBtnStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
    color: "white", borderRadius: "8px", width: "36px", height: "36px",
    cursor: "pointer", fontSize: "16px", display: "flex",
    alignItems: "center", justifyContent: "center",
};

const iconBtnStyle: React.CSSProperties = {
    background: "none", border: "none", cursor: "pointer",
    fontSize: "14px", padding: "2px 4px",
};