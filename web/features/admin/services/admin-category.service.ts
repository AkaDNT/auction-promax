/**
 * Admin Category Service
 * SOLID: Single Responsibility - manages category API calls
 * Dependency: API client, types
 */

import type {
  AdminCategory,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from "@/features/admin/types";
import {
  authHttpFetch,
  parseJsonResponse,
} from "@/features/auth/services/auth-http.client";

export async function listAdminCategories(): Promise<AdminCategory[]> {
  const response = await authHttpFetch("/auction-categories");

  if (!response.ok) {
    throw new Error("Failed to fetch categories");
  }

  return parseJsonResponse<AdminCategory[]>(response);
}

export async function getAdminCategoryById(
  categoryId: string,
): Promise<AdminCategory> {
  const response = await authHttpFetch(
    `/auction-categories/${encodeURIComponent(categoryId)}`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch category");
  }

  return parseJsonResponse<AdminCategory>(response);
}

export async function createAdminCategory(
  request: CreateCategoryRequest,
): Promise<AdminCategory> {
  const response = await authHttpFetch("/admin/auction-categories", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error("Failed to create category");
  }

  return parseJsonResponse<AdminCategory>(response);
}

export async function updateAdminCategory(
  categoryId: string,
  request: UpdateCategoryRequest,
): Promise<AdminCategory> {
  const response = await authHttpFetch(
    `/admin/auction-categories/${categoryId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to update category");
  }

  return parseJsonResponse<AdminCategory>(response);
}

export async function deleteAdminCategory(categoryId: string): Promise<void> {
  const response = await authHttpFetch(
    `/admin/auction-categories/${categoryId}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    throw new Error("Failed to delete category");
  }
}
