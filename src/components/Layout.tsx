"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useAppStore } from "@/lib/store";
import { 
  Home, 
  Calendar, 
  BarChart2, 
  User, 
  Bell, 
  LogOut, 
  Sun, 
  Moon,
  Menu,
  X,
  Settings
} from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  
  const { 
    darkMode, 
    setDarkMode, 
    toggleDarkMode, 
    unreadCount, 
    fetchNotifications,
    notifications,
    readNotification,
    readAllNotifications
  } = useAppStore();

  const [isBellOpen, setIsBellOpen] = useState(false);

  // 다크모드 초기화
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setDarkMode(savedTheme);
    } else {
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setDarkMode(systemPrefersDark ? "dark" : "light");
    }
  }, [setDarkMode]);

  // 알림 주기적 폴링 (PRD 7-1: 폴링 또는 SSE 지원)
  useEffect(() => {
    if (status === "authenticated") {
      fetchNotifications();
      const interval = setInterval(() => {
        fetchNotifications();
      }, 30000); // 30초 간격 폴링
      return () => clearInterval(interval);
    }
  }, [status, fetchNotifications]);

  const navItems = [
    { name: "홈", path: "/", icon: Home },
    { name: "훈련 및 경기 일정", path: "/games", icon: Calendar },
    { name: "팀 기록", path: "/stats/team", icon: BarChart2 },
    { name: "개인 기록", path: "/stats/personal", icon: User },
    { name: "출결 현황", path: "/attendance", icon: Bell },
    { name: "마이페이지", path: "/mypage", icon: Settings },
  ];

  // 로그인 상태가 아닐 때는 헤더/푸터 없이 화면만 렌더링 (로그인, 회원가입 페이지용)
  const isAuthPage = pathname === "/login" || pathname === "/register" || pathname === "/";
  if (isAuthPage) {
    return <div className="min-h-screen">{children}</div>;
  }

  // 로딩 중일 때
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-customBg-light dark:bg-customBg-dark">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-light dark:border-primary-dark"></div>
      </div>
    );
  }

  // 로그인되지 않은 사용자 리다이렉트
  if (status === "unauthenticated") {
    router.replace("/login");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-customBg-light dark:bg-customBg-dark text-customText-light dark:text-customText-dark">
      {/* 1. 데스크톱 좌측 사이드바 (md 이상 노출) */}
      <aside className="hidden md:flex flex-col w-64 bg-surface-light dark:bg-surface-dark border-r border-customBorder-light dark:border-customBorder-dark p-6 justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <span className="text-xl font-bold tracking-wider text-primary-light dark:text-primary-dark">
              언주중학교
            </span>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary-light text-white dark:bg-primary-dark dark:text-customBg-dark shadow-md"
                      : "hover:bg-muted dark:hover:bg-muted-foreground/10 text-muted-foreground hover:text-customText-light dark:hover:text-customText-dark"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-4 pt-6 border-t border-customBorder-light dark:border-customBorder-dark">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-muted-foreground">{session?.user?.name}님 ({session?.user?.role})</span>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:bg-muted dark:hover:bg-muted-foreground/10"
            >
              {darkMode === "dark" ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4 text-primary-light" />}
            </button>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
          >
            <LogOut className="w-5 h-5" />
            로그아웃
          </button>
        </div>
      </aside>

      {/* 2. 모바일/글로벌 공통 레이아웃 구조 */}
      <div className="flex-1 flex flex-col min-h-screen pb-16 md:pb-0">
        {/* 모바일 상단 헤더 */}
        <header className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-md border-b border-customBorder-light dark:border-customBorder-dark">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-primary-light dark:text-primary-dark md:hidden">
              한가람 타이탄즈
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* 알림 버튼 & 드롭다운 */}
            <div className="relative">
              <button
                onClick={() => setIsBellOpen(!isBellOpen)}
                className="relative p-2 rounded-full hover:bg-muted dark:hover:bg-muted-foreground/10 transition-colors"
              >
                <Bell className="w-5 h-5 text-customText-light dark:text-customText-dark" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xxs font-bold leading-none text-white transform translate-x-1/3 -translate-y-1/3 bg-danger-light rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* 알림 드롭다운 */}
              {isBellOpen && (
                <div className="absolute right-0 mt-3 w-80 max-h-96 overflow-y-auto bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark rounded-xl shadow-2xl z-50 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-customBorder-light dark:border-customBorder-dark pb-2">
                    <span className="font-semibold text-sm">알림 내역</span>
                    <button
                      onClick={readAllNotifications}
                      className="text-xs text-primary-light dark:text-primary-dark font-semibold hover:underline"
                    >
                      모두 읽음
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {notifications.length === 0 ? (
                      <div className="text-center py-6 text-sm text-muted-foreground">아직 새로운 알림이 없습니다.</div>
                    ) : (
                      notifications.map((noti) => (
                        <div
                          key={noti.id}
                          onClick={() => {
                            if (!noti.isRead) readNotification(noti.id);
                            if (noti.linkUrl) {
                              router.push(noti.linkUrl);
                              setIsBellOpen(false);
                            }
                          }}
                          className={`p-3 rounded-lg text-xs cursor-pointer border transition-colors ${
                            noti.isRead
                              ? "bg-transparent border-transparent text-muted-foreground"
                              : "bg-primary-light/5 border-primary-light/20 text-customText-light dark:text-customText-dark hover:bg-primary-light/10"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-semibold">{noti.title}</span>
                            <span className="text-xxs text-muted-foreground">
                              {new Date(noti.createdAt).toLocaleDateString("ko-KR", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                          <p className="line-clamp-2">{noti.body}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 모바일 다크모드 토글 */}
            <button
              onClick={toggleDarkMode}
              className="md:hidden p-2 rounded-full hover:bg-muted dark:hover:bg-muted-foreground/10"
            >
              {darkMode === "dark" ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-primary-light" />}
            </button>
          </div>
        </header>

        {/* 메인 콘텐츠 영역 */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {children}
        </main>

        {/* 3. 모바일 하단 내비게이션 바 (md 미만 노출) */}
        <footer className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-light dark:bg-surface-dark border-t border-customBorder-light dark:border-customBorder-dark z-40">
          <nav className="flex justify-around items-center h-16">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex flex-col items-center justify-center w-full h-full text-xxs transition-colors ${
                    isActive
                      ? "text-primary-light dark:text-primary-dark font-semibold"
                      : "text-muted-foreground hover:text-customText-light dark:hover:text-customText-dark"
                  }`}
                >
                  <Icon className="w-5 h-5 mb-1" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </footer>
      </div>
    </div>
  );
}
