"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { collection, query, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useProducts } from "@/hooks/useProducts";
import { usePrices } from "@/hooks/usePrices";
import { clearAuth } from "@/lib/auth";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────

type FilterKey = "today" | "yesterday" | "7" | "14" | "30" | "all";

interface FilterOption {
    key: FilterKey;
    label: string;
}

interface MenuItem {
    label: string;
    icon: string;
    path: string;
}

interface ChartItem {
    id: string;
    name: string;
    qty: number;
}

// ✅ ตรงกับ Flutter OrderService — field ชื่อ "items" และ "created_at"
interface OrderDoc {
    items?: Record<string, number>;   // ← Flutter เขียน "items" ไม่ใช่ "quantities"
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

const BAR_COLORS: string[] = [
    "#f59e0b", "#f97316", "#ef4444", "#d4a853",
    "#3b82f6", "#22c55e", "#a855f7", "#ec4899",
    "#06b6d4", "#14b8a6", "#6366f1", "#84cc16",
];

const MENU_ITEMS: MenuItem[] = [
    { label: "ออเดอร์", icon: "📋", path: "/order-monitor" },
    { label: "รวดเร็ว", icon: "⚡", path: "/quick-copy-text" },
    { label: "เพิ่มสินค้า", icon: "➕", path: "/product-create" },
    { label: "แก้ไข", icon: "✏️", path: "/product-list" },
    { label: "สร้างภาพ", icon: "🖼️", path: "/generate-image" },
    { label: "ก็อปชื่อ", icon: "📄", path: "/copy-product" },
    { label: "เช็คออเดอร์", icon: "🔍", path: "/check-order" },
    { label: "พรีออเดอร์", icon: "🗓️", path: "/preorder-input" },
    { label: "สรุปพรีออเดอร์", icon: "📊", path: "/preorder-summary" },
    { label: "ราคา", icon: "💰", path: "/price-settings" },
    { label: "อาหาร", icon: "🍽️", path: "/food" },
    { label: "เลือกสินค้า", icon: "🛒", path: "/select-product" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isInRange(createdAt: Date, filter: FilterKey): boolean {
    const now = new Date();
    if (filter === "today") {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return createdAt >= start;
    }
    if (filter === "yesterday") {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return createdAt >= start && createdAt < end;
    }
    if (filter === "7") return createdAt >= new Date(Date.now() - 7 * 86_400_000);
    if (filter === "14") return createdAt >= new Date(Date.now() - 14 * 86_400_000);
    if (filter === "30") return createdAt >= new Date(Date.now() - 30 * 86_400_000);
    return true; // "all"
}

function calcProfit(
    total: number,
    prices: { pd_price_1: number; pd_price_2: number; pd_price_3: number; pd_price_4: number },
): number {
    if (total >= 5000) return total * prices.pd_price_4;
    if (total >= 3000) return total * prices.pd_price_3;
    if (total >= 1000) return total * prices.pd_price_2;
    return total * prices.pd_price_1;
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const navBtnStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
    color: "white", borderRadius: "8px", width: "36px", height: "36px",
    cursor: "pointer", fontSize: "16px", display: "flex",
    alignItems: "center", justifyContent: "center",
};

const cardStyle: React.CSSProperties = {
    background: "white", borderRadius: "14px",
    border: "1px solid var(--border)", padding: "20px",
    marginBottom: "20px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
};

const menuBtnStyle: React.CSSProperties = {
    background: "var(--bg)", border: "1.5px solid var(--border)",
    borderRadius: "12px", padding: "12px 8px", cursor: "pointer",
    display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
    transition: "all 0.15s", fontFamily: "Sarabun, sans-serif",
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function MenuPage() {
    const router = useRouter();
    const { products } = useProducts();
    const { prices } = usePrices();

    const [filter, setFilter] = useState<FilterKey>("7");
    const [bestSeller, setBestSeller] = useState<Record<string, number>>({});
    const [loadingChart, setLoadingChart] = useState(false);

    const loadBestSeller = useCallback(async () => {
        setLoadingChart(true);
        try {
            const q = query(collection(db, "orders"), orderBy("created_at", "desc"));
            const snapshot = await getDocs(q);
            const counts: Record<string, number> = {};

            snapshot.docs.forEach((doc) => {
                const data = doc.data() as OrderDoc;

                // กรองตามวันที่
                const createdAt: Date | undefined = data.created_at?.toDate();
                if (filter !== "all") {
                    if (!createdAt) return;
                    if (!isInRange(createdAt, filter)) return;
                }

                // ✅ อ่าน "items" ให้ตรงกับที่ Flutter เขียนไว้ใน Firestore
                const items = data.items ?? {};
                Object.entries(items).forEach(([id, qty]) => {
                    counts[id] = (counts[id] ?? 0) + qty;
                });
            });

            setBestSeller(counts);
        } catch (e: unknown) {
            console.error("loadBestSeller error:", e);
        } finally {
            setLoadingChart(false);
        }
    }, [filter]);

    useEffect(() => {
        loadBestSeller();
    }, [loadBestSeller]);

    const top12: ChartItem[] = Object.entries(bestSeller)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 12)
        .map(([id, qty]) => ({
            id,
            name: products.find((p) => p.id === id)?.name ?? "ไม่ทราบ",
            qty,
        }));

    const totalItems = Object.values(bestSeller).reduce((a, b) => a + b, 0);
    const totalProfit = calcProfit(totalItems, prices);

    const fmt = (n: number) => n.toLocaleString("th-TH");
    const fmtMoney = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 2 });

    function handleLogout() {
        clearAuth();
        router.push("/pin");
    }

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg)" }}>

            {/* Navbar */}
            <nav style={{
                background: "var(--brown)", borderBottom: "3px solid var(--primary)",
                padding: "0 20px", height: "56px", display: "flex",
                alignItems: "center", justifyContent: "space-between",
                boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
            }}>
                <span style={{ fontFamily: "Prompt, sans-serif", fontWeight: 600, fontSize: "17px", color: "white" }}>
                    🌾 เมนูหลัก
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => router.push("/best-seller-all")} title="ดูสถิติทั้งหมด" style={navBtnStyle}>📈</button>
                    <button onClick={handleLogout} title="ออกจากระบบ" style={navBtnStyle}>🚪</button>
                </div>
            </nav>

            <div style={{ maxWidth: "960px", margin: "0 auto", padding: "20px 16px" }}>

                {/* Menu Grid */}
                <div style={cardStyle}>
                    <h3 style={{ fontFamily: "Prompt, sans-serif", fontSize: "14px", color: "var(--text-muted)", marginBottom: "14px", fontWeight: 500 }}>
                        เมนูทั้งหมด
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: "10px" }}>
                        {MENU_ITEMS.map((item) => (
                            <button
                                key={item.path}
                                onClick={() => router.push(item.path)}
                                style={menuBtnStyle}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "var(--primary-light)";
                                    e.currentTarget.style.borderColor = "var(--primary)";
                                    e.currentTarget.style.transform = "translateY(-2px)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "var(--bg)";
                                    e.currentTarget.style.borderColor = "var(--border)";
                                    e.currentTarget.style.transform = "translateY(0)";
                                }}
                            >
                                <span style={{ fontSize: "22px" }}>{item.icon}</span>
                                <span style={{ fontSize: "11px", color: "var(--brown)", fontWeight: 600, textAlign: "center", lineHeight: 1.3 }}>
                                    {item.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Best Seller Chart */}
                <div style={cardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                        <h3 style={{ fontFamily: "Prompt, sans-serif", fontSize: "16px", fontWeight: 700, color: "var(--brown)", margin: 0 }}>
                            📊 สินค้าขายดี TOP 12
                        </h3>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--primary)", marginBottom: "2px" }}>
                                รวม: {fmt(totalItems)} ชิ้น
                            </div>
                            <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--danger)" }}>
                                ฿{fmtMoney(totalProfit)}
                            </div>
                        </div>
                    </div>

                    {/* Filter Chips */}
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
                        {FILTERS.map((f) => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                style={{
                                    padding: "5px 14px", borderRadius: "20px", fontSize: "13px",
                                    fontFamily: "Sarabun, sans-serif", cursor: "pointer",
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

                    {/* Chart */}
                    {loadingChart ? (
                        <div style={{ height: "300px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <div style={{
                                width: "32px", height: "32px",
                                border: "3px solid var(--border)",
                                borderTopColor: "var(--primary)", borderRadius: "50%",
                                animation: "spin 0.8s linear infinite",
                            }} />
                            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                        </div>
                    ) : top12.length === 0 ? (
                        <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "14px" }}>
                            ยังไม่มีข้อมูลสินค้าขายดี
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={top12} margin={{ top: 8, right: 8, left: 0, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ebe0" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 10, fill: "#6b4c2a" }}
                                    angle={-35}
                                    textAnchor="end"
                                    interval={0}
                                    tickFormatter={(v: string) => v.length > 8 ? `${v.slice(0, 8)}…` : v}
                                />
                                <YAxis tick={{ fontSize: 11, fill: "#6b4c2a" }} width={40} />
                                <Tooltip
                                    formatter={(value: number | undefined) => [`${fmt(value ?? 0)} ชิ้น`, "จำนวน"]}
                                    contentStyle={{ fontFamily: "Sarabun, sans-serif", fontSize: "13px", borderRadius: "8px", border: "1px solid var(--border)" }}
                                />
                                <Bar dataKey="qty" radius={[4, 4, 0, 0]}>
                                    {top12.map((_, i) => (
                                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
}