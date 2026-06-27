import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

export interface AuthenticatedUser {
  id: string;
  name: string;
  loginId: string;
  role: string;
  clubId: string;
  status: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // 1. 헤더 혹은 쿠키에서 토큰 파싱
    let token = this.extractTokenFromHeader(request);
    if (!token) {
      token = this.extractTokenFromCookie(request);
    }

    if (!token) {
      throw new UnauthorizedException('인증 토큰이 누락되었습니다.');
    }

    try {
      // 2. NextAuth.js의 JWT 디코딩 검증 (HS256 및 NEXTAUTH_SECRET 공유)
      const secret = process.env.NEXTAUTH_SECRET || 'nextauth-baseball-fallback-secret-2026';
      
      // jsonwebtoken 검증
      const decoded = jwt.verify(token, secret) as any;
      
      if (!decoded) {
        throw new UnauthorizedException('유효하지 않은 인증 토큰입니다.');
      }

      // 3. 만료 및 유저 정보 바인딩
      // NextAuth 토큰 형식 매핑
      request.user = {
        id: decoded.id || decoded.sub,
        name: decoded.name,
        loginId: decoded.loginId,
        role: decoded.role || 'MEMBER',
        clubId: decoded.clubId,
        status: decoded.status,
      } as AuthenticatedUser;

      // 비활성(INACTIVE) 사용자의 API 호출 차단
      if (request.user.status === 'INACTIVE') {
        throw new ForbiddenException('비활성화된 계정입니다.');
      }

      return true;
    } catch (err: any) {
      console.error('JWT 검증 실패:', err.message);
      throw new UnauthorizedException('인증에 실패하였습니다.');
    }
  }

  private extractTokenFromHeader(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }

  private extractTokenFromCookie(request: any): string | null {
    // raw cookie 파싱
    const rawCookie = request.headers.cookie;
    if (!rawCookie) return null;

    const cookies = rawCookie.split(';').reduce((acc: any, cookie: string) => {
      const parts = cookie.split('=');
      acc[parts[0].trim()] = (parts[1] || '').trim();
      return acc;
    }, {});

    // NextAuth 개발용/상용 쿠키 명칭 매칭
    return cookies['next-auth.session-token'] || cookies['__Secure-next-auth.session-token'] || null;
  }
}
