import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

const api = "http://127.0.0.1:3103/api/v1";

async function mockAuth(request: APIRequestContext, appContext: string) {
  const response = await request.post(`${api}/auth/mock`, { data: { appContext } });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{ accessToken: string; roles: string[]; user: { id: string } }>;
}

test.describe("phase 1 identity and authentication", () => {
  test("authenticates client, updates profile, preferences, terms, and sessions", async ({
    request,
  }) => {
    const auth = await mockAuth(request, "CLIENT_APP");
    expect(auth.roles).toContain("CLIENT");

    const profile = await request.patch(`${api}/me`, {
      headers: { authorization: `Bearer ${auth.accessToken}` },
      data: { displayName: "Client E2E", city: "Tashkent", phone: "+998901112233" },
    });
    expect(profile.ok()).toBeTruthy();
    expect((await profile.json()).displayName).toBe("Client E2E");

    const preferences = await request.patch(`${api}/me/preferences`, {
      headers: { authorization: `Bearer ${auth.accessToken}` },
      data: { locale: "uz", theme: "LIGHT", notificationsEnabled: true },
    });
    expect(preferences.ok()).toBeTruthy();
    expect((await preferences.json()).locale).toBe("uz");

    const terms = await request.post(`${api}/me/accept-terms`, {
      headers: { authorization: `Bearer ${auth.accessToken}` },
    });
    expect(terms.ok()).toBeTruthy();
    expect((await terms.json()).acceptedTermsAt).toBeTruthy();

    const sessions = await request.get(`${api}/me/sessions`, {
      headers: { authorization: `Bearer ${auth.accessToken}` },
    });
    expect(sessions.ok()).toBeTruthy();
    expect((await sessions.json()).sessions.length).toBeGreaterThan(0);
  });

  test("authenticates driver with driver profile but not admin access", async ({ request }) => {
    const auth = await mockAuth(request, "DRIVER_APP");
    expect(auth.roles).toContain("DRIVER");
    const me = await request.get(`${api}/me`, {
      headers: { authorization: `Bearer ${auth.accessToken}` },
    });
    expect((await me.json()).driverProfile.verificationStatus).toBe("NOT_SUBMITTED");

    const forbidden = await request.get(`${api}/admin/users`, {
      headers: { authorization: `Bearer ${auth.accessToken}` },
    });
    expect(forbidden.status()).toBe(403);
  });

  test("allows read-only admin users list", async ({ request }) => {
    const auth = await mockAuth(request, "ADMIN_WEB");
    expect(auth.roles).toContain("ADMIN");
    const users = await request.get(`${api}/admin/users`, {
      headers: { authorization: `Bearer ${auth.accessToken}` },
    });
    expect(users.ok()).toBeTruthy();
    expect((await users.json()).users.length).toBeGreaterThan(0);
  });
});
