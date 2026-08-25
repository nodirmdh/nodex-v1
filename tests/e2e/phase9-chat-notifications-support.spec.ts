import { expect, test, type APIRequestContext } from "@playwright/test";

const client = "http://127.0.0.1:3100";
const driver = "http://127.0.0.1:3101";
const admin = "http://127.0.0.1:3102";
const api = "http://127.0.0.1:3103/api/v1";

async function mockAuth(request: APIRequestContext, appContext: string) {
  const response = await request.post(`${api}/auth/mock`, { data: { appContext } });
  await expect(response).toBeOK();
  return response.json() as Promise<{ accessToken: string; roles: string[]; user: { id: string } }>;
}

test.describe("phase 9 chat, notifications, and support", () => {
  test("creates an idempotent booking conversation and sends a message", async ({ request }) => {
    const auth = await mockAuth(request, "CLIENT_APP");
    const create = await request.post(`${api}/conversations`, {
      headers: { authorization: `Bearer ${auth.accessToken}` },
      data: { bookingId: "phase6-booking-confirmed" },
    });
    expect(create.status()).toBe(201);
    const body = (await create.json()) as { conversation: { id: string; participants: unknown[] } };
    expect(body.conversation.id).toBeTruthy();
    expect(body.conversation.participants.length).toBeGreaterThanOrEqual(2);

    const message = await request.post(`${api}/conversations/${body.conversation.id}/messages`, {
      headers: { authorization: `Bearer ${auth.accessToken}` },
      data: {
        clientMessageId: `phase9-e2e-${Date.now()}`,
        type: "TEXT",
        text: "Phase 9 smoke message",
      },
    });
    expect(message.status()).toBe(201);
    const messageBody = (await message.json()) as {
      message: { text: string; receipts: unknown[] };
    };
    expect(messageBody.message.text).toBe("Phase 9 smoke message");
    expect(messageBody.message.receipts.length).toBeGreaterThanOrEqual(1);
  });

  test("lists notifications and supports read lifecycle", async ({ request }) => {
    const auth = await mockAuth(request, "CLIENT_APP");
    const notifications = await request.get(`${api}/notifications`, {
      headers: { authorization: `Bearer ${auth.accessToken}` },
    });
    await expect(notifications).toBeOK();
    const body = (await notifications.json()) as {
      notifications: Array<{ id: string; title: string; deliveries: unknown[] }>;
    };
    expect(body.notifications.length).toBeGreaterThanOrEqual(1);
    expect(body.notifications[0]?.deliveries.length).toBeGreaterThanOrEqual(1);

    const read = await request.post(`${api}/notifications/${body.notifications[0]!.id}/read`, {
      headers: { authorization: `Bearer ${auth.accessToken}` },
    });
    await expect(read).toBeOK();
  });

  test("creates support tickets and exposes admin support history", async ({ request }) => {
    const clientAuth = await mockAuth(request, "CLIENT_APP");
    const ticket = await request.post(`${api}/support/tickets`, {
      headers: { authorization: `Bearer ${clientAuth.accessToken}` },
      data: {
        type: "BOOKING",
        subject: `Phase 9 e2e support ${Date.now()}`,
        description: "Please help with a confirmed booking chat.",
        priority: "NORMAL",
        bookingId: "phase6-booking-confirmed",
      },
    });
    expect(ticket.status()).toBe(201);
    const created = (await ticket.json()) as { ticket: { id: string; status: string } };
    expect(created.ticket.status).toBe("NEW");

    const adminAuth = await mockAuth(request, "ADMIN_WEB");
    const reply = await request.post(`${api}/admin/support/tickets/${created.ticket.id}/reply`, {
      headers: { authorization: `Bearer ${adminAuth.accessToken}` },
      data: { text: "Support has started reviewing this ticket." },
    });
    expect(reply.status()).toBe(201);

    const history = await request.get(`${api}/admin/support/tickets/${created.ticket.id}/history`, {
      headers: { authorization: `Bearer ${adminAuth.accessToken}` },
    });
    await expect(history).toBeOK();
    expect(await history.text()).toContain("SUPPORT_AGENT_REPLIED");
  });

  test("renders client, driver, and admin communication surfaces", async ({ page }) => {
    await page.goto(`${client}/messages`);
    await expect(page.getByRole("heading", { name: "Booking chat" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Parcel chat" })).toBeVisible();

    await page.goto(`${client}/notifications`);
    await expect(page.getByText("Support ticket updated")).toBeVisible();

    await page.goto(`${client}/support`);
    await expect(
      page.getByRole("heading", { name: "Phase 9 seeded support ticket" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Add message" })).toBeVisible();

    await page.goto(`${driver}/messages`);
    await expect(page.getByRole("heading", { name: "Passenger chat" })).toBeVisible();

    await page.goto(`${driver}/support`);
    await expect(page.getByRole("button", { name: "Contact support" })).toBeVisible();

    await page.goto(`${admin}/communications`);
    await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Conversation queue" })).toContainText("Trip");
    await expect(page.getByRole("region", { name: "Conversation inspector" })).toContainText(
      "Internal note",
    );

    await page.goto(`${admin}/support`);
    await expect(page.getByRole("heading", { name: "Support" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Support queue" })).toContainText("SUP-1842");
    await expect(page.getByRole("region", { name: "Support ticket detail" })).toContainText(
      "Add internal note",
    );
  });
});
