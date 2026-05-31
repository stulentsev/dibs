CREATE TYPE item_status AS ENUM ('draft', 'available', 'claimed', 'sold', 'given_away', 'hidden');

CREATE TABLE items (
  id serial PRIMARY KEY,
  title varchar(180) NOT NULL,
  description text NOT NULL,
  price_cents integer,
  is_free boolean NOT NULL DEFAULT false,
  status item_status NOT NULL DEFAULT 'draft',
  category varchar(120),
  pickup_notes text,
  published boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE item_photos (
  id serial PRIMARY KEY,
  item_id integer NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  path varchar(512) NOT NULL,
  alt_text varchar(200),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX item_photos_item_sort_idx ON item_photos (item_id, sort_order);
CREATE INDEX items_public_idx ON items (published, status, created_at);
