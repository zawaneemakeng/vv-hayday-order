"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { setAuth } from "@/lib/auth";

const CORRECT_PIN = "3695";

export default function PinPage() {
    const router = useRouter();
    const [pin, setPin] = useState(["", "", "", ""]);
    const [error, setError] = useState(false);
    const [shake, setShake] = useState(false);
    const inputs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        inputs.current[0]?.focus();
    }, []);

    function handleChange(index: number, value: string) {
        if (!/^\d*$/.test(value)) return; // ตัวเลขเท่านั้น
        const newPin = [...pin];
        newPin[index] = value.slice(-1); // เอาแค่ตัวสุดท้าย
        setPin(newPin);
        setError(false);

        // เลื่อนไปช่องถัดไป
        if (value && index < 3) {
            inputs.current[index + 1]?.focus();
        }

        // ครบ 4 หลัก → ตรวจสอบ
        if (index === 3 && value) {
            const entered = [...newPin.slice(0, 3), value].join("");
            checkPin(entered);
        }
    }

    function handleKeyDown(index: number, e: React.KeyboardEvent) {
        if (e.key === "Backspace" && !pin[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    }

    function checkPin(entered: string) {
        if (entered === CORRECT_PIN) {
            setAuth();
            router.push("/menu");
        } else {
            setError(true);
            setShake(true);
            setTimeout(() => {
                setPin(["", "", "", ""]);
                setShake(false);
                inputs.current[0]?.focus();
            }, 600);
        }
    }

    return (
        <div style={{
            minHeight: "100vh", background: "var(--bg)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "16px",
        }}>
            <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-10px); }
          40%      { transform: translateX(10px); }
          60%      { transform: translateX(-6px); }
          80%      { transform: translateX(6px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

            <div style={{
                background: "white", borderRadius: "24px",
                padding: "40px 36px", width: "100%", maxWidth: "360px",
                boxShadow: "0 8px 40px rgba(0,0,0,0.1)",
                animation: "fadeIn 0.3s ease-out",
                textAlign: "center",
            }}>

                {/* Icon */}
                <div style={{
                    width: "64px", height: "64px", borderRadius: "50%",
                    background: "var(--primary-light)", border: "2px solid var(--primary)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 20px", fontSize: "28px",
                }}>
                    🔐
                </div>

                <h2 style={{
                    fontFamily: "Prompt, sans-serif", fontWeight: 700,
                    fontSize: "20px", color: "var(--brown)", marginBottom: "6px",
                }}>
                    กรอก PIN
                </h2>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "28px" }}>
                    กรุณาใส่รหัส PIN 4 หลักเพื่อเข้าสู่ระบบ
                </p>

                {/* PIN Inputs */}
                <div style={{
                    display: "flex", gap: "12px", justifyContent: "center",
                    marginBottom: "20px",
                    animation: shake ? "shake 0.5s ease-in-out" : "none",
                }}>
                    {pin.map((digit, i) => (
                        <input
                            key={i}
                            ref={(el) => { inputs.current[i] = el; }}
                            type="password"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(i, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(i, e)}
                            style={{
                                width: "56px", height: "64px",
                                textAlign: "center", fontSize: "24px", fontWeight: 700,
                                border: `2px solid ${error ? "var(--danger)" : digit ? "var(--primary)" : "var(--border)"}`,
                                borderRadius: "12px", outline: "none",
                                background: error ? "#fff5f5" : digit ? "var(--primary-light)" : "white",
                                color: "var(--brown)",
                                fontFamily: "Prompt, sans-serif",
                                transition: "border-color 0.2s, background 0.2s",
                                caretColor: "transparent",
                            }}
                            onFocus={(e) => {
                                if (!error) e.target.style.borderColor = "var(--primary)";
                            }}
                        />
                    ))}
                </div>

                {/* Error message */}
                <div style={{
                    height: "20px", marginBottom: "8px",
                    fontSize: "13px", color: "var(--danger)",
                    fontWeight: 600, transition: "opacity 0.2s",
                    opacity: error ? 1 : 0,
                }}>
                    PIN ไม่ถูกต้อง กรุณาลองใหม่
                </div>
            </div>
        </div>
    );
}