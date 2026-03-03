import {
    collection, addDoc, deleteDoc, updateDoc,
    doc, query, orderBy, onSnapshot,
    serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ProductModel, ProductType } from "@/types/product";

function fromFirestore(id: string, data: Record<string, unknown>): ProductModel {
    return {
        id,
        name: (data["name"] as string) ?? "",
        type: (data["type"] as ProductType) ?? ProductType.food,
        imageUrl: (data["image_url"] as string) ?? "",
        inStock: (data["in_stock"] as boolean) ?? true,
        isBestSeller: (data["is_best_seller"] as boolean) ?? false,
        level: (data["level"] as number) ?? 0,
        createdAt: (data["created_at"] as Timestamp)?.toDate(),
    };
}

// แทน Stream ใน Flutter → ใช้ onSnapshot + callback
export function subscribeToProducts(
    callback: (products: ProductModel[]) => void
): () => void {
    const q = query(collection(db, "products"), orderBy("created_at", "asc"));

    return onSnapshot(q, (snapshot) => {
        callback(
            snapshot.docs.map((doc) =>
                fromFirestore(doc.id, doc.data() as Record<string, unknown>)  // ✅ cast ชัดเจน
            )
        );
    });
}

export async function addProduct(product: Omit<ProductModel, "id">) {
    await addDoc(collection(db, "products"), {
        name: product.name,
        type: product.type,
        image_url: product.imageUrl,
        in_stock: product.inStock,
        is_best_seller: product.isBestSeller,
        level: product.level,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
    });
}

export async function deleteProduct(id: string) {
    await deleteDoc(doc(db, "products", id));
}

export async function updateProduct(product: ProductModel) {
    await updateDoc(doc(db, "products", product.id), {
        name: product.name,
        type: product.type,
        image_url: product.imageUrl,
        in_stock: product.inStock,
        is_best_seller: product.isBestSeller,
        level: product.level,
        updated_at: serverTimestamp(),
    });
}