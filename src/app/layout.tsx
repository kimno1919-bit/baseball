import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Layout } from "@/components/Layout";

export const metadata: Metadata = {
  title: "한가람 타이탄즈 - 야구 스포츠클럽 관리 시스템",
  description: "학교 스포츠클럽 야구반을 위한 올인원 출결·기록·시즌 통계 분석 웹앱",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <Providers>
          <Layout>{children}</Layout>
        </Providers>
      </body>
    </html>
  );
}
