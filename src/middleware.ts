import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// route ที่ต้อง login ก่อน
const PROTECTED = ["/menu", "/order-summary", "/product-create", "/product-list",
    "/product-update", "/order-monitor", "/order-detail", "/coin",
    "/generate-image", "/best-seller-all", "/price-settings"];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const isProtected = PROTECTED.some((p) => pathname.startsWith(p));

    if (isProtected) {
        const auth = request.cookies.get("hd_auth")?.value;
        if (auth !== "true") {
            return NextResponse.redirect(new URL("/pin", request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/menu/:path*", "/order-summary/:path*", "/product-create/:path*",
        "/product-list/:path*", "/order-monitor/:path*", "/price-settings/:path*"],
};