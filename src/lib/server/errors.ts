import "server-only";
import { NextResponse } from "next/server";

export type BackendErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_AUTH_TOKEN"
  | "APP_CHECK_REQUIRED"
  | "APP_CHECK_INVALID"
  | "DOCUMENT_NOT_FOUND"
  | "DOCUMENT_FORBIDDEN"
  | "DOCUMENT_IMMUTABLE"
  | "PRO_REQUIRED"
  | "FREE_LIMIT_REACHED"
  | "PAYMENT_REQUIRED"
  | "ORDER_NOT_FOUND"
  | "ORDER_NOT_PAID"
  | "ORDER_ALREADY_RESERVED"
  | "ORDER_ALREADY_CONSUMED"
  | "GENERATION_IN_PROGRESS"
  | "GENERATION_FAILED"
  | "ARTIFACT_NOT_FOUND"
  | "ACCESS_LINK_INVALID"
  | "R2_UPLOAD_FAILED"
  | "R2_DELETE_FAILED"
  | "R2_SIGN_FAILED"
  | "SERVER_MISCONFIGURED"
  | "INTERNAL_ERROR";

export class BackendError extends Error {
  public readonly code: BackendErrorCode;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: BackendErrorCode,
    status: number,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "BackendError";
    this.code = code;
    this.status = status;
    this.details = details;
  }

  public toResponse(): NextResponse {
    return NextResponse.json(
      {
        error: {
          code: this.code,
          message: this.message,
          ...(this.details ? { details: this.details } : {}),
        },
      },
      {
        status: this.status,
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "application/json; charset=utf-8",
        },
      }
    );
  }

  public static fromUnknown(err: unknown): BackendError {
    if (err instanceof BackendError) {
      return err;
    }
    return new BackendError(
      "INTERNAL_ERROR",
      500,
      "Ocorreu um erro interno. Tente novamente mais tarde."
    );
  }
}

export function isBackendError(error: unknown): error is BackendError {
  return error instanceof BackendError;
}
