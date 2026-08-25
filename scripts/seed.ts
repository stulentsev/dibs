import { eq } from 'drizzle-orm';
import { getDb } from '../src/lib/server/db/client';
import { items, users } from '../src/lib/server/db/schema';
import { ensureOwner } from '../src/lib/server/users';

await ensureOwner();

const db = getDb();
const [owner] = await db.select().from(users).where(eq(users.role, 'owner')).limit(1);
if (!owner) {
  throw new Error('Owner account missing; cannot seed items.');
}
const canPublish = Boolean(owner.contactType && owner.contactValue);

await db.insert(items).values([
  {
    ownerId: owner.id,
    title: 'Oak side table',
    description: 'Small solid wood side table with a few surface marks.',
    priceCents: 2500,
    isFree: false,
    status: 'available',
    category: 'Furniture',
    pickupNotes: 'Porch pickup after 6pm.',
    published: canPublish
  },
  {
    ownerId: owner.id,
    title: 'Box of plant pots',
    description: 'Mixed ceramic and plastic pots from a spring clean.',
    priceCents: null,
    isFree: true,
    status: 'available',
    category: 'Garden',
    pickupNotes: 'Please take the whole box.',
    published: canPublish
  },
  {
    ownerId: owner.id,
    title: 'Desk lamp',
    description: 'Adjustable lamp, working bulb included.',
    priceCents: 800,
    isFree: false,
    status: 'draft',
    category: 'Home',
    published: false
  }
]);

console.log('Seeded sample items.');
if (!canPublish) console.log('Complete the owner profile before publishing the sample items.');
