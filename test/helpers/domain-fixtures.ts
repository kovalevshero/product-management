import { hash } from 'argon2';
import { sql } from 'drizzle-orm';
import { users, products, productVariants } from '../../src/database/schema/index.js';
import type { TestContext } from './test-context.js';

export async function seedActor(ctx: TestContext, role: 'admin' | 'staff' | 'viewer') {
  const username = `demo_${role}_${Math.random().toString(36).slice(2, 10)}`;
  const [user] = await ctx.db.insert(users).values({ username, password: await hash('demo-secret123') }).returning();
  await ctx.db.execute(sql`UPDATE users SET role = ${role} WHERE id = ${user.id}`);
  const r = await ctx.api.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password: 'demo-secret123' } });
  if (r.statusCode !== 200) throw new Error('Actor fixture login failed');
  return { id: user.id, token: r.json().authentication_token };
}

export async function seedProduct(ctx: TestContext, actorId: number) {
  const [p] = await ctx.db.insert(products).values({ title: 'Synthetic demo shirt', price: '99.99', category: 'Demo', images: [],
    createdBy: 'Demo', updatedBy: 'Demo', createdById: String(actorId), updatedById: String(actorId) }).returning();
  return { id: p.id };
}

export const bearer = (actor: { token: string }) => ({ authorization: `Bearer ${actor.token}` });
export async function seedVariant(ctx: TestContext, productId: number, sku = 'DEMO-BLACK-M') {
  const [v] = await ctx.db.insert(productVariants).values({ productId, sku, label: 'Demo Black M', price: '99.99' }).returning();
  return { id: v.id };
}
export const demoProduct = { title: 'Synthetic demo shirt', price: 99.99, category: 'Demo', images: ['https://example.com/demo.jpg'] };
