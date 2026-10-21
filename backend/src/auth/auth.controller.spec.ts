import type { Request, Response } from "express";

import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";

describe("AuthController", () => {
  const auth = {
    revokeRefreshSession: jest.fn(),
  } as unknown as AuthService;
  const controller = new AuthController(auth);
  let response: { clearCookie: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    response = { clearCookie: jest.fn() };
    (auth.revokeRefreshSession as jest.Mock).mockResolvedValue(undefined);
  });

  it("revokes the refresh session and clears the cookie on logout", async () => {
    const request = {
      headers: {
        cookie: "other=value; tram_k_refresh=refresh%2Btoken",
      },
    } as Request;

    await expect(
      controller.logout(request, response as unknown as Response),
    ).resolves.toEqual({ success: true, data: null });

    expect(auth.revokeRefreshSession).toHaveBeenCalledWith("refresh+token");
    expect(response.clearCookie).toHaveBeenCalledWith("tram_k_refresh", {
      path: "/auth",
    });
  });

  it("clears the cookie without revoking when no refresh token is present", async () => {
    const request = { headers: {} } as Request;

    await expect(
      controller.logout(request, response as unknown as Response),
    ).resolves.toEqual({ success: true, data: null });

    expect(auth.revokeRefreshSession).not.toHaveBeenCalled();
    expect(response.clearCookie).toHaveBeenCalledWith("tram_k_refresh", {
      path: "/auth",
    });
  });
});
