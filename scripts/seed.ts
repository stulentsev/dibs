import { getDb } from '../src/lib/server/db/client';
import { items } from '../src/lib/server/db/schema';

const db = getDb();

await db.insert(items).values([
  {
    title: 'Oak side table',
    description: 'Small solid wood side table with a few surface marks.',
    priceCents: 2500,
    isFree: false,
    status: 'available',
    category: 'Furniture',
    pickupNotes: 'Porch pickup after 6pm.',
    published: true
  },
  {
    title: 'Box of plant pots',
    description: 'Mixed ceramic and plastic pots from a spring clean.',
    priceCents: null,
    isFree: true,
    status: 'available',
    category: 'Garden',
    pickupNotes: 'Please take the whole box.',
    published: true
  },
  {
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
