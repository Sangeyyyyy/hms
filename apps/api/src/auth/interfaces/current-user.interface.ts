export interface CurrentUser {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}
