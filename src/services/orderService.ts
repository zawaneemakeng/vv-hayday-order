// src/services/orderService.ts  ← สร้างไฟล์ใหม่
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function saveOrder(quantities: Record<string, number>): Promise<string> {
    const ref = await addDoc(collection(db, "orders"), {
        quantities,
        created_at: serverTimestamp(),
        status: "pending",
    });
    return ref.id;
}