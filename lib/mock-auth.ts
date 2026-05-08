export const SESSION_COOKIE = "admin_session"

export const MOCK_ADMIN = {
  email: "admin@erp.com",
  password: "admin123",
  name: "Super Admin",
} as const

export function verifyCredentials(email: string, password: string) {
  return email === MOCK_ADMIN.email && password === MOCK_ADMIN.password
}
