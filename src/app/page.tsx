"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useProducts } from "@/hooks/useProducts";
import { usePrices } from "@/hooks/usePrices";
import { ProductModel } from "@/types/product";
import { saveOrder } from "@/services/orderService";
import {
  RotateCcw, Search, X, SlidersHorizontal,
  ShoppingCart, AlertTriangle, CheckCircle,
  ClipboardList, Flame, Trophy, Star,
} from "lucide-react";

function calcPrice(total: number, p1: number, p2: number, p3: number) {
  if (total >= 3000) return total * p3;
  if (total >= 1000) return total * p2;
  return total * p1;
}

export default function ProductOrderPage() {
  const router = useRouter();
  const { products, isLoading } = useProducts();
  const { prices } = usePrices();

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [minLevel, setMinLevel] = useState<number | null>(null);
  const [maxLevel, setMaxLevel] = useState<number | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [modal, setModal] = useState<{ title: string; message: string; items?: string[] } | null>(null);

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => p.inStock)
      .filter((p) => searchQuery ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) : true)
      .filter((p) => minLevel !== null ? p.level >= minLevel : true)
      .filter((p) => maxLevel !== null ? p.level <= maxLevel : true);
  }, [products, searchQuery, minLevel, maxLevel]);

  const totalItems = Object.values(quantities).reduce((a, b) => a + b, 0);
  const totalPrice = calcPrice(totalItems, prices.pd_price_1, prices.pd_price_2, prices.pd_price_3);
  const isFilterActive = minLevel !== null || maxLevel !== null;

  function setQty(productId: string, value: string) {
    const qty = parseInt(value) || 0;
    setQuantities((prev) => ({ ...prev, [productId]: qty }));
  }

  function isInvalid(productId: string) {
    const qty = quantities[productId] ?? 0;
    return qty > 0 && (qty < 20 || qty % 10 !== 0);
  }

  async function handleConfirm() {
    const hasProduct = Object.values(quantities).some((q) => q > 0);
    if (!hasProduct) {
      setModal({ title: "ไม่มีสินค้า", message: "กรุณาเลือกสินค้าและกรอกจำนวนก่อนดำเนินการต่อ" });
      return;
    }
    const invalid = Object.entries(quantities).filter(
      ([, qty]) => qty > 0 && (qty < 20 || qty % 10 !== 0)
    );
    if (invalid.length > 0) {
      const names = invalid.map(([id, qty]) => {
        const p = products.find((p) => p.id === id);
        return `${p?.name ?? id} (จำนวน: ${qty})`;
      });
      setModal({
        title: "จำนวนไม่ถูกต้อง",
        message: "สินค้าต่อไปนี้มีจำนวนไม่ถูกต้อง ขั้นต่ำ 20 ชิ้น และต้องหาร 10 ลงตัว",
        items: names,
      });
      return;
    }
    const orderId = await saveOrder(quantities);
    const params = new URLSearchParams({
      orderId,
      quantities: JSON.stringify(quantities),
    });
    router.push(`/order-summary?${params}`);
  }

  const fmt = (n: number) => n.toLocaleString("th-TH");
  const fmtMoney = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 2 });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg)" }}>

      {/* Navbar */}
      <nav style={{
        background: "var(--brown)", borderBottom: "3px solid var(--primary)",
        padding: "0 20px", height: "56px", display: "flex",
        alignItems: "center", justifyContent: "space-between",
        flexShrink: 0, boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
      }}>
        <button onClick={() => setQuantities({})} title="รีเซ็ต" style={{
          background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
          color: "white", borderRadius: "8px", width: "36px", height: "36px",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <RotateCcw size={16} />
        </button>

        <span style={{ fontFamily: "Prompt, sans-serif", fontWeight: 600, fontSize: "17px", color: "white" }}>
          สั่งซื้อสินค้า
        </span>

        <div style={{
          background: "var(--primary)", color: "var(--brown)",
          fontWeight: 700, fontSize: "13px", padding: "5px 12px",
          borderRadius: "20px", fontFamily: "Prompt, sans-serif",
        }}>
          {fmt(totalItems)} ชิ้น
        </div>
      </nav>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>

        {/* Note */}
        <div style={{
          background: "#fff8e6", border: "1px solid #fcd97a",
          borderLeft: "4px solid var(--warning)", borderRadius: "8px",
          padding: "9px 14px", marginBottom: "14px", fontSize: "13px", color: "#92600a",
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <AlertTriangle size={15} strokeWidth={2.5} style={{ flexShrink: 0 }} />
          <span><strong>โน๊ต:</strong> จำนวนต้องไม่มีเศษ เช่น 20, 80, 250 &nbsp;|&nbsp; ขั้นต่ำ <strong>20 ชิ้น</strong></span>
        </div>

        {/* Search + Filter */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={15} style={{
              position: "absolute", left: "11px", top: "50%",
              transform: "translateY(-50%)", color: "var(--text-muted)",
            }} />
            <input
              type="text" placeholder="ค้นหาสินค้า..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%", height: "40px", paddingLeft: "34px",
                paddingRight: searchQuery ? "34px" : "12px",
                border: "1.5px solid var(--border)", borderRadius: "10px",
                background: "white", fontSize: "14px", color: "var(--text)",
                outline: "none", fontFamily: "Sarabun, sans-serif",
              }}
              onFocus={(e) => e.target.style.borderColor = "var(--primary)"}
              onBlur={(e) => e.target.style.borderColor = "var(--border)"}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={{
                position: "absolute", right: "10px", top: "50%",
                transform: "translateY(-50%)", background: "none",
                border: "none", cursor: "pointer", color: "var(--text-muted)",
                display: "flex", alignItems: "center",
              }}>
                <X size={15} />
              </button>
            )}
          </div>
          <button onClick={() => setShowFilter(true)} style={{
            height: "40px", padding: "0 14px",
            border: `1.5px solid ${isFilterActive ? "var(--primary)" : "var(--border)"}`,
            borderRadius: "10px",
            background: isFilterActive ? "var(--primary-light)" : "white",
            color: isFilterActive ? "var(--primary-dark)" : "var(--text-muted)",
            cursor: "pointer", fontSize: "13px", fontFamily: "Sarabun, sans-serif",
            fontWeight: isFilterActive ? 600 : 400, whiteSpace: "nowrap",
            display: "flex", alignItems: "center", gap: "6px",
          }}>
            <SlidersHorizontal size={14} />
            Level {isFilterActive ? `(${minLevel ?? "?"}-${maxLevel ?? "?"})` : ""}
          </button>
        </div>

        {/* Cards */}
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
            <div style={{
              width: "36px", height: "36px", border: "3px solid var(--border)",
              borderTopColor: "var(--primary)", borderRadius: "50%",
              animation: "spin 0.8s linear infinite", margin: "0 auto 12px",
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ fontSize: "14px" }}>กำลังโหลดสินค้า...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
            <Search size={40} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
            <p style={{ fontSize: "14px" }}>
              {searchQuery ? `ไม่พบสินค้า "${searchQuery}"` : "ยังไม่มีสินค้า"}
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
            {filteredProducts.map((product: ProductModel) => {
              const qty = quantities[product.id] ?? 0;
              const invalid = isInvalid(product.id);
              return (
                <div key={product.id} style={{
                  background: "white",
                  border: `1.5px solid ${invalid ? "var(--danger)" : qty > 0 ? "var(--primary)" : "var(--border)"}`,
                  borderRadius: "12px", padding: "12px 14px",
                  display: "flex", alignItems: "center", gap: "12px",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                  boxShadow: qty > 0 ? "0 2px 10px rgba(212,168,83,0.15)" : "0 1px 4px rgba(0,0,0,0.05)",
                }}>
                  <div style={{
                    width: "46px", height: "46px", flexShrink: 0, borderRadius: "50%",
                    background: "var(--primary-light)", border: "2px solid var(--border)",
                    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                  }}>
                    <img src={product.imageUrl} alt={product.name}
                      style={{ width: "32px", height: "32px", objectFit: "contain" }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <span style={{
                        fontSize: "14px", fontWeight: 600, color: "var(--text)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{product.name}</span>
                      {product.isBestSeller && (
                        <span style={{
                          background: "var(--danger)", color: "white",
                          fontSize: "10px", fontWeight: 700,
                          padding: "1px 6px", borderRadius: "4px", flexShrink: 0,
                          display: "flex", alignItems: "center", gap: "3px",
                        }}>
                          <Star size={9} fill="white" strokeWidth={0} />
                          ขายดี
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Lv.{product.level}</span>
                  </div>
                  <input
                    type="number"
                    value={qty === 0 ? "" : qty}
                    placeholder="จำนวน"
                    onChange={(e) => setQty(product.id, e.target.value)}
                    style={{
                      width: "80px", height: "38px", flexShrink: 0,
                      textAlign: "center",
                      border: `1.5px solid ${invalid ? "var(--danger)" : qty > 0 ? "var(--primary)" : "var(--border)"}`,
                      borderRadius: "8px", fontSize: "14px", fontWeight: 600,
                      color: invalid ? "var(--danger)" : "var(--text)",
                      background: invalid ? "#fff5f5" : "white",
                      outline: "none", fontFamily: "Sarabun, sans-serif",
                    }}
                    onFocus={(e) => e.target.style.borderColor = invalid ? "var(--danger)" : "var(--primary)"}
                    onBlur={(e) => e.target.style.borderColor = invalid ? "var(--danger)" : qty > 0 ? "var(--primary)" : "var(--border)"}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky Bottom Bar */}
      <div style={{
        flexShrink: 0, background: "white", borderTop: "2px solid var(--border)",
        padding: "14px 20px", display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: "16px",
        boxShadow: "0 -4px 16px rgba(0,0,0,0.08)",
      }}>
        <div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "2px" }}>ยอดรวมทั้งหมด</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--brown)", fontFamily: "Prompt, sans-serif", lineHeight: 1.2 }}>
            ฿{fmtMoney(totalPrice)}
          </div>
          <div style={{ fontSize: "11px", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
            {totalItems === 0 && <span style={{ color: "var(--text-muted)" }}>ยังไม่มีสินค้า</span>}
            {totalItems > 0 && totalItems < 1000 && (
              <>
                <Flame size={12} color="var(--warning)" />
                <span style={{ color: "var(--warning)", fontWeight: 600 }}>อีก {fmt(1000 - totalItems)} ชิ้น รับราคาพิเศษ!</span>
              </>
            )}
            {totalItems >= 1000 && totalItems < 3000 && (
              <>
                <Flame size={12} color="#2563eb" />
                <span style={{ color: "#2563eb", fontWeight: 600 }}>อีก {fmt(3000 - totalItems)} ชิ้น รับราคาดียิ่งขึ้น!</span>
              </>
            )}
            {totalItems >= 3000 && (
              <>
                <Trophy size={12} color="var(--success)" />
                <span style={{ color: "var(--success)", fontWeight: 600 }}>ราคาขั้นสูงสุดแล้ว!</span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={handleConfirm}
          style={{
            background: "var(--brown)", color: "white", border: "none",
            borderRadius: "10px", padding: "12px 28px", fontSize: "15px",
            fontWeight: 700, fontFamily: "Prompt, sans-serif", cursor: "pointer",
            boxShadow: "0 3px 10px rgba(61,43,26,0.3)", whiteSpace: "nowrap",
            display: "flex", alignItems: "center", gap: "8px",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--primary-dark)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "var(--brown)"}
          onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.97)"}
          onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
        >
          <ClipboardList size={16} />
          ยืนยันคำสั่งซื้อ
        </button>
      </div>

      {/* Alert Modal */}
      {modal && (
        <AlertModal
          title={modal.title}
          message={modal.message}
          items={modal.items}
          onClose={() => setModal(null)}
        />
      )}

      {/* Level Filter Modal */}
      {showFilter && (
        <LevelFilterModal
          minLevel={minLevel}
          maxLevel={maxLevel}
          onApply={(min, max) => { setMinLevel(min); setMaxLevel(max); setShowFilter(false); }}
          onClose={() => setShowFilter(false)}
        />
      )}
    </div>
  );
}

// ── Alert Modal ───────────────────────────────────────────────────────────────

function AlertModal({
  title, message, items, onClose,
}: {
  title: string;
  message: string;
  items?: string[];
  onClose: () => void;
}) {
  const isError = items && items.length > 0;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 300, padding: "16px", backdropFilter: "blur(4px)",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "white", borderRadius: "20px",
        width: "100%", maxWidth: "380px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        overflow: "hidden", animation: "modalPop 0.2s ease-out",
      }}>
        <style>{`
          @keyframes modalPop {
            from { opacity: 0; transform: scale(0.92) translateY(8px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* Header */}
        <div style={{
          background: isError ? "#fff5f5" : "#fff8e6",
          borderBottom: `2px solid ${isError ? "#fecaca" : "#fcd97a"}`,
          padding: "24px 24px 20px", textAlign: "center",
        }}>
          <div style={{
            width: "56px", height: "56px", borderRadius: "50%",
            background: isError ? "#fee2e2" : "#fef3c7",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 12px",
          }}>
            {isError
              ? <AlertTriangle size={26} color="#b91c1c" />
              : <ShoppingCart size={26} color="#92600a" />
            }
          </div>
          <h3 style={{
            fontFamily: "Prompt, sans-serif", fontSize: "18px",
            fontWeight: 700, color: isError ? "#b91c1c" : "#92600a", margin: 0,
          }}>
            {title}
          </h3>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>
          <p style={{
            fontSize: "14px", color: "var(--text-muted)",
            textAlign: "center", lineHeight: 1.7,
            marginBottom: items?.length ? "16px" : 0,
          }}>
            {message}
          </p>
          {items && items.length > 0 && (
            <div style={{
              background: "#fff5f5", border: "1px solid #fecaca",
              borderRadius: "10px", padding: "12px 14px",
              maxHeight: "160px", overflowY: "auto",
            }}>
              {items.map((item, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "5px 0",
                  borderBottom: i < items.length - 1 ? "1px solid #fee2e2" : "none",
                  fontSize: "13px", color: "#b91c1c", fontWeight: 500,
                }}>
                  <AlertTriangle size={12} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "0 24px 24px" }}>
          <button
            onClick={onClose}
            style={{
              width: "100%", height: "46px",
              background: isError ? "#b91c1c" : "var(--brown)",
              color: "white", border: "none", borderRadius: "10px",
              fontSize: "15px", fontWeight: 700,
              fontFamily: "Prompt, sans-serif", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.85"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
          >
            <CheckCircle size={16} />
            ตกลง
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Level Filter Modal ────────────────────────────────────────────────────────

function LevelFilterModal({
  minLevel, maxLevel, onApply, onClose,
}: {
  minLevel: number | null;
  maxLevel: number | null;
  onApply: (min: number | null, max: number | null) => void;
  onClose: () => void;
}) {
  const [localMin, setLocalMin] = useState(minLevel?.toString() ?? "");
  const [localMax, setLocalMax] = useState(maxLevel?.toString() ?? "");

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 200, padding: "16px",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "white", borderRadius: "16px", padding: "28px",
        width: "100%", maxWidth: "360px", boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
      }}>
        <h3 style={{
          fontFamily: "Prompt, sans-serif", color: "var(--brown)",
          fontSize: "17px", marginBottom: "20px",
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <SlidersHorizontal size={18} />
          กรอง Level สินค้า
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
          {[
            { label: "Level ต่ำสุด", value: localMin, setter: setLocalMin, placeholder: "เช่น 1" },
            { label: "Level สูงสุด", value: localMax, setter: setLocalMax, placeholder: "เช่น 100" },
          ].map(({ label, value, setter, placeholder }) => (
            <div key={label}>
              <label style={{
                display: "block", fontSize: "12px",
                color: "var(--text-muted)", marginBottom: "6px", fontWeight: 500,
              }}>{label}</label>
              <input
                type="number" value={value}
                onChange={(e) => setter(e.target.value)}
                placeholder={placeholder}
                style={{
                  width: "100%", height: "40px",
                  border: "1.5px solid var(--border)", borderRadius: "8px",
                  padding: "0 12px", fontSize: "14px", color: "var(--text)",
                  outline: "none", fontFamily: "Sarabun, sans-serif",
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--primary)"}
                onBlur={(e) => e.target.style.borderColor = "var(--border)"}
              />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => onApply(null, null)} style={{
            flex: 1, height: "42px", border: "1.5px solid var(--border)",
            borderRadius: "8px", background: "white", color: "var(--text-muted)",
            fontSize: "14px", cursor: "pointer", fontFamily: "Sarabun, sans-serif",
          }}>ล้างค่า</button>
          <button
            onClick={() => onApply(
              localMin ? parseInt(localMin) : null,
              localMax ? parseInt(localMax) : null,
            )}
            style={{
              flex: 1, height: "42px", border: "none", borderRadius: "8px",
              background: "var(--brown)", color: "white", fontSize: "14px",
              fontWeight: 700, cursor: "pointer", fontFamily: "Sarabun, sans-serif",
            }}
          >ยืนยัน</button>
        </div>
      </div>
    </div>
  );
}