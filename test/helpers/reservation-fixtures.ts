import type { TestContext } from './test-context.js';
import { seedActor, seedProduct, seedVariant, bearer } from './domain-fixtures.js';
export async function reservationStock(ctx: TestContext, quantity = 1) {
  const actor = await seedActor(ctx, 'admin'), product = await seedProduct(ctx, actor.id), variant = await seedVariant(ctx, product.id);
  const r = await ctx.api.inject({ method: 'POST', url: '/api/inventory/movements', headers: bearer(actor), payload: { variant_id: variant.id, kind: 'IN', delta: quantity, reason: 'Synthetic reservation fixture' } });
  if (r.statusCode !== 201) throw new Error('Reservation stock fixture failed');
  return { actor, product, variant };
}
