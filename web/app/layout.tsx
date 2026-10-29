import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "From Your Garage — 질문으로 찾는 내 브랜드",
  description: "질문에 답하다 보면 내가 원래 생각하던 브랜드를 찾아 정리해 드려요.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
