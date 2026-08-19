import type { View } from "@/components/docfacil/nav-context";

export interface AuthReturnTarget {
  view: View;
  params?: Record<string, string | undefined>;
}

const ALLOWED_RETURN_VIEWS = new Set<View>([
  "criar",
  "checkout",
  "dashboard",
  "perfil",
  "documento-detalhe",
]);

export function buildAuthReturnParams(target: AuthReturnTarget): Record<string, string> {
  const params: Record<string, string> = { returnView: target.view };
  for (const [key, value] of Object.entries(target.params || {})) {
    if (value) params[`return_${key}`] = value;
  }
  return params;
}

export function resolveAuthReturn(
  params: Record<string, string | undefined>
): AuthReturnTarget {
  const rawView = params.returnView as View | undefined;
  if (!rawView || !ALLOWED_RETURN_VIEWS.has(rawView)) {
    return { view: "dashboard" };
  }

  const restored: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key.startsWith("return_") && value) {
      restored[key.slice("return_".length)] = value;
    }
  }

  return {
    view: rawView,
    params: Object.keys(restored).length > 0 ? restored : undefined,
  };
}
