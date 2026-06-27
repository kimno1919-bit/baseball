"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Lock, User as UserIcon, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId || !password) {
      setError("학번과 비밀번호를 입력해주세요.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        loginId,
        password,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError("로그인 처리 중 예기치 못한 에러가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light/20 via-customBg-light to-secondary-light/10 dark:from-primary-dark/10 dark:via-customBg-dark dark:to-secondary-dark/5 p-4">
      <div className="w-full max-w-md bg-white/80 dark:bg-surface-dark/60 backdrop-blur-xl border border-customBorder-light dark:border-customBorder-dark p-8 rounded-3xl shadow-2xl space-y-6">
        
        {/* 헤더 및 로고 */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-4 bg-primary-light/10 dark:bg-primary-dark/20 text-primary-light dark:text-primary-dark rounded-2xl mb-2">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">한가람 타이탄즈</h1>
          <p className="text-xs text-muted-foreground">학교 스포츠클럽 야구부 경기분석 및 출결 시스템</p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-danger-light/10 dark:bg-danger-dark/20 text-danger-light dark:text-danger-dark text-xs rounded-xl border border-danger-light/20">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">학번</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <UserIcon className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="학번을 입력해주세요 (예: 20260001)"
                className="w-full pl-10 pr-4 py-3 bg-surface-light dark:bg-surface-dark/40 border border-customBorder-light dark:border-customBorder-dark rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark transition-all"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">비밀번호</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력해주세요"
                className="w-full pl-10 pr-4 py-3 bg-surface-light dark:bg-surface-dark/40 border border-customBorder-light dark:border-customBorder-dark rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark transition-all"
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-primary-light hover:bg-primary-light/90 dark:bg-primary-dark dark:hover:bg-primary-dark/95 text-white dark:text-customBg-dark font-bold text-sm rounded-xl shadow-lg hover:shadow-xl active:scale-98 transition-all flex items-center justify-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white dark:border-customBg-dark border-t-transparent"></span>
            ) : (
              "로그인"
            )}
          </button>
        </form>

        {/* 푸터 가입 링크 */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t border-customBorder-light dark:border-customBorder-dark">
          아직 회원이 아니신가요?{" "}
          <Link
            href="/register"
            className="text-primary-light dark:text-primary-dark font-semibold hover:underline"
          >
            가입 신청하기
          </Link>
        </div>

      </div>
    </div>
  );
}
