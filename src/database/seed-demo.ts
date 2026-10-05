import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import { hash } from 'argon2';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { and, eq, sql } from 'drizzle-orm';
import { users, products, productVariants, stockMovements, auditLogs } from './schema/index.js';
import { assertSchemaReady } from './migrations.js';

export async function seedDemo(databaseUrl: string): Promise<void> {
  const parsed = new URL(databaseUrl);
  if (process.env.NODE_ENV === 'production' || !['postgres:', 'postgresql:'].includes(parsed.protocol) ||
    !['/product_management_demo', '/product_management_test'].includes(parsed.pathname)) throw new Error('Demo seed requires an explicitly allowed non-production database');
  await assertSchemaReady(databaseUrl);
  const client = postgres(databaseUrl, { max: 1, connect_timeout: 3 });
  try {
    const db = drizzle(client);
    await db.transaction(async tx => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(730106)`);
      const accounts = [];
      for (const role of ['admin', 'staff', 'viewer'] as const) {
        const username = `demo_${role}`;
        await tx.insert(users).values({ username, role, password: await hash('demo-secret123'), fullName: `Synthetic Demo ${role}` }).onConflictDoNothing();
        const [actor] = await tx.select().from(users).where(eq(users.username, username));
        if (actor.role !== role) throw new Error('Demo account role conflicts with existing data');
        accounts.push(actor);
      }
      const admin = accounts[0], staff = accounts[1];
      let [product] = await tx.select().from(products).where(and(eq(products.title, 'Synthetic Demo Shirt'), eq(products.createdById, String(admin.id))));
      if (!product) {
        [product] = await tx.insert(products).values({ title: 'Synthetic Demo Shirt', price: '99.99', category: 'Synthetic Demo',
          description: 'Portfolio demonstration data', images: ['https://example.com/demo-shirt.jpg'], createdBy: admin.fullName!, updatedBy: admin.fullName!,
          createdById: String(admin.id), updatedById: String(admin.id) }).returning();
        await tx.insert(auditLogs).values({ actorId: admin.id, action: 'product.create', entityType: 'product', entityId: String(product.id), before: null, after: { id: product.id, title: product.title } });
      }
      if (product.archivedAt) throw new Error('Demo product was archived; use a fresh demo database');
      for (const sku of ['DEMO-BLACK-M', 'DEMO-WHITE-L']) {
        const [inserted] = await tx.insert(productVariants).values({ productId: product.id, sku, label: sku, price: '99.99' }).onConflictDoNothing().returning();
        const [variant] = await tx.select().from(productVariants).where(eq(productVariants.sku, sku)).for('update');
        if (variant.productId !== product.id) throw new Error('Demo SKU conflicts with existing data');
        if (inserted) await tx.insert(auditLogs).values({ actorId: admin.id, action: 'variant.create', entityType: 'variant', entityId: String(variant.id), before: null, after: { id: variant.id, sku } });
        const existing = await tx.select({ id: stockMovements.id }).from(stockMovements).where(and(eq(stockMovements.variantId, variant.id), eq(stockMovements.reason, 'Synthetic demo opening stock')));
        if (existing.length) continue;
        if (variant.onHand !== 0 || variant.reserved !== 0) throw new Error('Demo opening stock requires a zero balance');
        await tx.update(productVariants).set({ onHand: 10, updatedAt: new Date() }).where(eq(productVariants.id, variant.id));
        const [movement] = await tx.insert(stockMovements).values({ variantId: variant.id, kind: 'IN', delta: 10, reason: 'Synthetic demo opening stock', actorId: staff.id }).returning();
        await tx.insert(auditLogs).values({ actorId: staff.id, action: 'stock_movement.create', entityType: 'stock_movement', entityId: String(movement.id),
          before: { variant_id: variant.id, on_hand: 0, reserved: 0 }, after: { variant_id: variant.id, on_hand: 10, reserved: 0 } });
      }
    });
  } finally { await client.end(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedDemo(process.env.DATABASE_URL!)
    .then(() => console.log('Synthetic demo data ready'))
    .catch(() => { console.error('Demo seed failed; verify allowed database, schema and demo data conflicts'); process.exitCode = 1; });
}
