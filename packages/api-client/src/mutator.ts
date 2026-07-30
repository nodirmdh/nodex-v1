export async function nodexFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = globalThis.process?.env?.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const url = new URL(path, baseUrl);
  const response = await fetch(url, {
    ...options,
    headers: { "content-type": "application/json", ...options.headers },
  });
  if (!response.ok) throw await response.json();
  return response.json() as Promise<T>;
}
