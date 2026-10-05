export interface PaginationMeta { page: number; limit: number; total: number; total_pages: number }
export function pagination(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, total_pages: Math.ceil(total / limit) || 1 };
}
