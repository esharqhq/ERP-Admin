// ── Profession types (mirror GermanyERP.Domain/Models/DTOs/Professions/ProfessionDtos.cs) ──
// List is auth-any; create/update/delete gated on profession:create/update/delete (140001-3).

export interface ProfessionDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

/** Create body — Code is required + immutable thereafter; Name required; Description optional. */
export interface CreateProfessionRequest {
  code: string;
  name: string;
  description?: string | null;
}

/**
 * Update body — Code is immutable, so only Name/Description.
 * Backend coalesces null → keep old; empty string "" → clears Description.
 * The form always sends both fields, so what the user sees is what is saved.
 */
export interface UpdateProfessionRequest {
  name: string;
  description: string;
}
