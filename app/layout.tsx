import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spatial — 递归智能界面",
  description:
    "一个关于 AI-native 界面、递归工作流与系统重构的空间化个人主页。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <head>
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#05060A" />
        <link rel="icon" href="data:," />
      </head>
      <body className="bg-[#05060A] text-[#EDE9E3] antialiased overscroll-none touch-manipulation">
        {children}
      </body>
    </html>
  );
}
