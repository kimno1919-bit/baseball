"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

export function Footer() {
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  return (
    <footer className="mt-16 pt-8 border-t border-customBorder-light dark:border-customBorder-dark text-xs text-muted-foreground flex flex-col items-center sm:items-start space-y-4 pb-8 md:pb-0">
      <div className="flex flex-wrap justify-center sm:justify-start gap-4 font-semibold text-customText-light dark:text-customText-dark">
        <button onClick={() => setIsTermsOpen(true)} className="hover:underline hover:text-primary-light dark:hover:text-primary-dark">
          이용약관
        </button>
        <button onClick={() => setIsPrivacyOpen(true)} className="hover:underline hover:text-primary-light dark:hover:text-primary-dark">
          개인정보처리방침
        </button>
      </div>

      <div className="space-y-1 text-center sm:text-left">
        <p>정보관리책임자: 언주중학교 야구부 관리자</p>
        <p>© 2026 Eonju Middle School Baseball Club. All rights reserved.</p>
      </div>

      {/* 이용약관 모달 */}
      {isTermsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="border-b border-customBorder-light dark:border-customBorder-dark pb-4 mb-4 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold text-customText-light dark:text-customText-dark">이용약관</h2>
              <button onClick={() => setIsTermsOpen(false)} className="text-muted-foreground hover:text-customText-light transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto pr-2 space-y-4 text-sm text-customText-light/90 dark:text-customText-dark/90 leading-relaxed">
              <p className="font-bold">제1조 (목적)</p>
              <p>본 약관은 사용자가 '언주중학교 야구부 웹 애플리케이션'(이하 "서비스")을 이용함에 있어 서비스 제공자와 사용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>
              
              <p className="font-bold pt-2">제2조 (서비스의 제공 및 변경)</p>
              <p>1. 본 서비스는 언주중학교 야구부원들의 경기/훈련 일정 공유, 출결 관리, 개인/팀 기록 통계를 제공하기 위한 목적으로 운영됩니다.<br />
              2. 서비스 제공자는 필요에 따라 서비스의 내용을 변경하거나 제공을 중단할 수 있으며, 이로 인해 사용자에게 발생한 불이익에 대해 책임을 지지 않습니다.</p>
              
              <p className="font-bold pt-2">제3조 (사용자의 의무)</p>
              <p>1. 사용자는 본 서비스를 이용함에 있어 타인의 명예를 훼손하거나 불법적인 목적으로 사용해서는 안 됩니다.<br />
              2. 사용자는 서비스 이용 시 건전한 목적에 맞게 활용해야 하며, 부적절한 게시물이나 데이터를 입력하여 타인에게 불쾌감을 주어서는 안 됩니다.<br />
              3. 부여받은 계정(학번 및 비밀번호)의 관리 책임은 사용자 본인에게 있습니다.</p>

              <p className="font-bold pt-2">제4조 (책임의 한계)</p>
              <p>1. 본 서비스는 야구부 내 원활한 소통과 기록 관리를 돕기 위한 보조 도구로써, 입력된 통계 기록이나 출결 사항의 법적 효력을 보장하지 않습니다.<br />
              2. 사용자 간의 분쟁이나 서비스 이용 중 발생하는 부가적 손해에 대하여 서비스 제공자는 어떠한 책임도 지지 않습니다.</p>

              <p className="font-bold pt-2">제5조 (약관의 효력 및 변경)</p>
              <p>본 약관은 사용자가 서비스를 이용하는 순간부터 효력이 발생하며, 서비스 제공자는 필요한 경우 공지 후 약관을 수정할 수 있습니다.</p>

              <p className="text-xs text-muted-foreground pt-4">*본 약관은 2026년 6월 30일부터 적용됩니다.*</p>
            </div>
            
            <div className="pt-6 mt-4 border-t border-customBorder-light dark:border-customBorder-dark shrink-0">
              <button
                onClick={() => setIsTermsOpen(false)}
                className="w-full py-3 bg-primary-light hover:bg-primary-light/95 dark:bg-primary-dark dark:text-customBg-dark text-white font-bold rounded-xl shadow-md transition-all"
              >
                확인했습니다
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 개인정보처리방침 모달 */}
      {isPrivacyOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="border-b border-customBorder-light dark:border-customBorder-dark pb-4 mb-4 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold text-customText-light dark:text-customText-dark">개인정보처리방침</h2>
              <button onClick={() => setIsPrivacyOpen(false)} className="text-muted-foreground hover:text-customText-light transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto pr-2 space-y-4 text-sm text-customText-light/90 dark:text-customText-dark/90 leading-relaxed">
              <p className="font-bold">1. 개인정보의 수집 및 이용 목적</p>
              <p>본 '언주중학교 야구부 웹 애플리케이션'(이하 "서비스")은 야구부원들의 신원 확인, 출결 관리, 기록 통계 및 원활한 커뮤니케이션을 위해 최소한의 개인정보를 수집 및 이용합니다.</p>
              
              <p className="font-bold pt-2">2. 수집하는 개인정보의 항목</p>
              <p>- 필수 수집 항목: 이름, 학번(로그인 ID), 비밀번호, 전화번호, 포지션, 투/타 방향<br />
              - 전화번호 및 비밀번호는 암호화(단방향/양방향) 처리되어 안전하게 저장됩니다.</p>
              
              <p className="font-bold pt-2">3. 개인정보의 보유 및 이용 기간</p>
              <p>사용자의 개인정보는 사용자가 야구부 서비스를 탈퇴(또는 관리자에 의해 계정 삭제 처리)할 때까지 보유 및 이용됩니다. 계정 삭제 시 해당 개인정보는 지체 없이 파기됩니다.</p>
              
              <p className="font-bold pt-2">4. 개인정보의 제3자 제공 및 위탁</p>
              <p>본 서비스는 수집된 개인정보를 오직 교내 야구부 관리 및 운영 목적으로만 사용하며, 원칙적으로 사용자의 사전 동의 없이 제3자에게 제공하거나 외부에 위탁하지 않습니다.</p>
              
              <p className="font-bold pt-2">5. 이용자의 권리</p>
              <p>사용자는 언제든지 자신의 개인정보를 열람하거나 수정할 수 있으며, 관리자에게 요청하여 가입 해지(개인정보 삭제)를 요구할 수 있습니다.</p>
              
              <p className="font-bold pt-2">6. 개인정보 보호책임자 및 담당자</p>
              <p>서비스 내 개인정보 보호에 대한 책임 및 문의사항은 아래 정보관리책임자에게 연락해주시기 바랍니다.<br />
              - 이름: 언주중학교 야구부 관리자</p>

              <p className="text-xs text-muted-foreground pt-4">*본 방침은 2026년 6월 30일부터 시행됩니다.*</p>
            </div>
            
            <div className="pt-6 mt-4 border-t border-customBorder-light dark:border-customBorder-dark shrink-0">
              <button
                onClick={() => setIsPrivacyOpen(false)}
                className="w-full py-3 bg-primary-light hover:bg-primary-light/95 dark:bg-primary-dark dark:text-customBg-dark text-white font-bold rounded-xl shadow-md transition-all"
              >
                확인했습니다
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
