import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AppError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}

export function handleRouteError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Request validation failed.",
        issues: error.flatten(),
      },
      { status: 400 },
    );
  }

  console.error(error);

  return NextResponse.json(
    {
      error: "Internal server error.",
    },
    { status: 500 },
  );
}
