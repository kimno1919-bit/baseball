"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, ChevronLeft, AlertCircle, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    loginId: "",
    password: "",
    phone: "",
    jerseyNumber: "",
    primaryPosition: "DH",
    battingHand: "R",
    throwingHand: "R",
    inviteCode: "",
  });

  const [passwordStrength, setPasswordStrength] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 비밀번호 강도 실시간 체크
  useEffect(() => {
    const pwd = formData.password;
    if (!pwd) {
      setPasswordStrength("");
      return;
    }

    const hasLetter = /[A-Za-z]/.test(pwd);
    const hasDigit = /\d/.test(pwd);
    const isLengthOk = pwd.length >= 8;

    if (isLengthOk && hasLetter && hasDigit) {
      setPasswordStrength("강함 (안전한 비밀번호)");
    } else if (isLengthOk || (hasLetter && hasDigit)) {
      setPasswordStrength("보통 (숫자/문자 조합 필요)");
    } else {
      setPasswordStrength("약함 (최소 8자, 영문+숫자 필요)");
    }
  }, [formData.password]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const { name, loginId, password, phone, inviteCode } = formData;
    if (!name || !loginId || !password || !phone || !inviteCode) {
      setError("필수 입력 항목을 모두 작성해주세요.");
      return;
    }

    // 비밀번호 정규식 검증
    const pwdRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*]{8,}$/;
    if (!pwdRegex.test(password)) {
      setError("비밀번호는 최소 8자 이상, 영문과 숫자의 조합이어야 합니다.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "가입 신청 중 오류가 발생했습니다.");
      } else {
        setSuccess(data.message);
        // 3초 후 로그인 페이지 이동
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      }
    } catch (err) {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light/20 via-customBg-light to-secondary-light/10 dark:from-primary-dark/10 dark:via-customBg-dark dark:to-secondary-dark/5 p-4 py-8">
      <div className="w-full max-w-lg bg-white/80 dark:bg-surface-dark/60 backdrop-blur-xl border border-customBorder-light dark:border-customBorder-dark p-8 rounded-3xl shadow-2xl space-y-6">
        
        {/* 상단 네비게이션 */}
        <div className="flex items-center justify-between border-b border-customBorder-light dark:border-customBorder-dark pb-4">
          <Link href="/login" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-customText-light dark:hover:text-customText-dark">
            <ChevronLeft className="w-4 h-4" />
            로그인으로
          </Link>
          <span className="text-xs font-semibold text-primary-light dark:text-primary-dark">부원 가입 신청</span>
        </div>

        {/* 헤더 */}
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold tracking-tight">타이탄즈 가입 신청</h1>
          <p className="text-xxs text-muted-foreground">초대 코드를 입력하고 가입을 신청하세요.</p>
        </div>

        {/* 상태 알림 */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-danger-light/10 dark:bg-danger-dark/20 text-danger-light dark:text-danger-dark text-xs rounded-xl border border-danger-light/20">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-3 bg-success-light/10 dark:bg-success-dark/20 text-success-light dark:text-success-dark text-xs rounded-xl border border-success-light/20">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-medium">{success}</span>
          </div>
        )}

        {/* 회원가입 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 초대 코드 */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">초대 코드 (6자리) *</label>
              <input
                type="text"
                name="inviteCode"
                value={formData.inviteCode}
                onChange={handleChange}
                placeholder="클럽 초대 코드를 입력하세요 (예: BASE26)"
                className="w-full px-4 py-2.5 bg-surface-light dark:bg-surface-dark/40 border border-customBorder-light dark:border-customBorder-dark rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark"
                disabled={isLoading || !!success}
              />
            </div>

            {/* 학번 */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">학번 *</label>
              <input
                type="text"
                name="loginId"
                value={formData.loginId}
                onChange={handleChange}
                placeholder="학번 입력 (예: 20260001)"
                className="w-full px-4 py-2.5 bg-surface-light dark:bg-surface-dark/40 border border-customBorder-light dark:border-customBorder-dark rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark"
                disabled={isLoading || !!success}
              />
            </div>

            {/* 이름 */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">이름 *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="이름 입력 (예: 홍길동)"
                className="w-full px-4 py-2.5 bg-surface-light dark:bg-surface-dark/40 border border-customBorder-light dark:border-customBorder-dark rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark"
                disabled={isLoading || !!success}
              />
            </div>

            {/* 비밀번호 */}
            <div className="space-y-1.5 md:col-span-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-muted-foreground">비밀번호 *</label>
                {passwordStrength && (
                  <span className={`text-[10px] font-semibold ${
                    passwordStrength.startsWith("강함")
                      ? "text-success-light dark:text-success-dark"
                      : passwordStrength.startsWith("보통")
                      ? "text-warning-light dark:text-warning-dark"
                      : "text-danger-light dark:text-danger-dark"
                  }`}>
                    {passwordStrength}
                  </span>
                )}
              </div>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="영문, 숫자 포함 8자 이상"
                className="w-full px-4 py-2.5 bg-surface-light dark:bg-surface-dark/40 border border-customBorder-light dark:border-customBorder-dark rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark"
                disabled={isLoading || !!success}
              />
            </div>

            {/* 전화번호 */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">전화번호 *</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="010-XXXX-XXXX 형식으로 입력"
                className="w-full px-4 py-2.5 bg-surface-light dark:bg-surface-dark/40 border border-customBorder-light dark:border-customBorder-dark rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark"
                disabled={isLoading || !!success}
              />
            </div>

            {/* 등번호 */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">등번호</label>
              <input
                type="number"
                name="jerseyNumber"
                value={formData.jerseyNumber}
                onChange={handleChange}
                placeholder="예: 7"
                className="w-full px-4 py-2.5 bg-surface-light dark:bg-surface-dark/40 border border-customBorder-light dark:border-customBorder-dark rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark"
                disabled={isLoading || !!success}
              />
            </div>

            {/* 포지션 */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">주포지션</label>
              <select
                name="primaryPosition"
                value={formData.primaryPosition}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-surface-light dark:bg-surface-dark/40 border border-customBorder-light dark:border-customBorder-dark rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark"
                disabled={isLoading || !!success}
              >
                <option value="P">투수 (P)</option>
                <option value="C">포수 (C)</option>
                <option value="1B">1루수 (1B)</option>
                <option value="2B">2루수 (2B)</option>
                <option value="3B">3루수 (3B)</option>
                <option value="SS">유격수 (SS)</option>
                <option value="LF">좌익수 (LF)</option>
                <option value="CF">중견수 (CF)</option>
                <option value="RF">우익수 (RF)</option>
                <option value="DH">지명타자 (DH)</option>
              </select>
            </div>

            {/* 타격손 */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">타석</label>
              <select
                name="battingHand"
                value={formData.battingHand}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-surface-light dark:bg-surface-dark/40 border border-customBorder-light dark:border-customBorder-dark rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark"
                disabled={isLoading || !!success}
              >
                <option value="R">우타 (Right)</option>
                <option value="L">좌타 (Left)</option>
                <option value="S">양타 (Switch)</option>
              </select>
            </div>

            {/* 투구손 */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">던지는 손</label>
              <select
                name="throwingHand"
                value={formData.throwingHand}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-surface-light dark:bg-surface-dark/40 border border-customBorder-light dark:border-customBorder-dark rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark"
                disabled={isLoading || !!success}
              >
                <option value="R">우투 (Right)</option>
                <option value="L">좌투 (Left)</option>
              </select>
            </div>

          </div>

          <button
            type="submit"
            className="w-full py-3 mt-4 bg-primary-light hover:bg-primary-light/90 dark:bg-primary-dark dark:hover:bg-primary-dark/95 text-white dark:text-customBg-dark font-bold text-sm rounded-xl shadow-lg active:scale-98 transition-all flex items-center justify-center"
            disabled={isLoading || !!success}
          >
            {isLoading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white dark:border-customBg-dark border-t-transparent"></span>
            ) : (
              "가입 신청 제출"
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
