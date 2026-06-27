import crypto from "crypto";
import bcrypt from "bcryptjs";

// AES-256-CBC 설정을 위한 키와 IV
// 로컬 테스트의 원활한 작동을 위해 fallback 키 설정
const ALGORITHM = "aes-256-cbc";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY 
  ? Buffer.from(process.env.ENCRYPTION_KEY, "hex")
  : crypto.scryptSync("baseball-club-secret-key-2026", "salt", 32);
const IV_LENGTH = 16;

/**
 * 전화번호 양식 암호화 (AES-256-CBC)
 */
export function encryptPhone(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  // iv와 encrypted 데이터를 함께 저장
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * 전화번호 양식 복호화
 */
export function decryptPhone(encryptedText: string): string {
  try {
    const textParts = encryptedText.split(":");
    const ivHex = textParts.shift();
    if (!ivHex) return "";
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, undefined, "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("복호화 에러:", error);
    return "복호화 실패";
  }
}

/**
 * 전화번호 마지막 4자리 마스킹 처리
 * 예: 010-1234-5678 -> 010-1234-****
 */
export function maskPhone(phone: string): string {
  if (!phone) return "";
  // 구분자가 있는 경우와 없는 경우 모두 처리
  const cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.length >= 10) {
    const p1 = phone.substring(0, phone.length - 4);
    return `${p1}****`;
  }
  return "****";
}

/**
 * 비밀번호 해싱 (bcrypt)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

/**
 * 비밀번호 검증 (bcrypt)
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
