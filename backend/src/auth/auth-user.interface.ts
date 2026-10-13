import { RoleName } from "@prisma/client";

export interface AuthenticatedUser {
  readonly id: string;
  readonly role: RoleName;
  readonly authVersion: number;
}
