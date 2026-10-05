import postgres from 'postgres';
export function assertAllowedDatabaseUrl(url: string, allows: (name: string) => boolean): string {
  const parsed = new URL(url);
  const name = decodeURIComponent(parsed.pathname.slice(1));
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || parsed.search || parsed.hash || !name || name.includes('/') || !allows(name)) {
    throw new Error('Protected operations require an allowed database URL without query parameters');
  }
  return name;
}
export async function verifyDatabaseTarget(url: string, expectedName: string): Promise<void> {
  const client = postgres(url, { max: 1, connect_timeout: 3, onnotice() {} });
  try {
    const [row] = await client`SELECT current_database() AS name`;
    if (row.name !== expectedName) throw new Error('Connected database does not match the allowed target');
  } finally { await client.end(); }
}
