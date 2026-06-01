import postgres from 'postgres';

export const e2eDatabaseUrl =
  process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL ?? 'postgres://dibs:dibs@localhost:5432/dibs_e2e';

export type SeededItems = {
  table: number;
  plantPots: number;
  draftLamp: number;
  claimedChair: number;
};

export function adminCredentials() {
  return {
    identifier: 'owner@example.com',
    password: 'password'
  };
}

export async function resetCatalog(): Promise<SeededItems> {
  const sql = postgres(e2eDatabaseUrl, { max: 1, prepare: false });

  try {
    await sql`truncate table item_photos, items restart identity cascade`;

    const rows = await sql<{ id: number; title: string }[]>`
      insert into items (title, description, price_cents, is_free, status, category, pickup_notes, published)
      values
        (
          'Oak side table',
          'Small solid wood side table with a few surface marks.',
          2500,
          false,
          'available',
          'Furniture',
          'Porch pickup after 6pm.',
          true
        ),
        (
          'Box of plant pots',
          'Mixed ceramic and plastic pots from a spring clean.',
          null,
          true,
          'available',
          'Garden',
          'Please take the whole box.',
          true
        ),
        (
          'Desk lamp',
          'Adjustable lamp, working bulb included.',
          800,
          false,
          'draft',
          'Home',
          null,
          false
        ),
        (
          'Reading chair',
          'Comfortable chair with a washable cover.',
          4000,
          false,
          'claimed',
          'Furniture',
          'Coordinate a weekend pickup.',
          true
        )
      returning id, title
    `;

    await sql`
      insert into item_photos (item_id, path, alt_text, sort_order)
      values
        (${rows.find((row) => row.title === 'Oak side table')!.id}, '/uploads/e2e/table.jpg', 'Oak side table on a porch', 0),
        (${rows.find((row) => row.title === 'Box of plant pots')!.id}, '/uploads/e2e/pots.jpg', 'A box of mixed plant pots', 0)
    `;

    return {
      table: rows.find((row) => row.title === 'Oak side table')!.id,
      plantPots: rows.find((row) => row.title === 'Box of plant pots')!.id,
      draftLamp: rows.find((row) => row.title === 'Desk lamp')!.id,
      claimedChair: rows.find((row) => row.title === 'Reading chair')!.id
    };
  } finally {
    await sql.end();
  }
}
