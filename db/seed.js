/* eslint-disable no-console */
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("Seeding categories...");
    const categories = ["Electronic", "Rooftop", "Festival", "Live Music", "Exclusive"];
    const categoryIds = {};
    for (const name of categories) {
      const res = await client.query(
        `INSERT INTO categories (name, slug) VALUES ($1,$2)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id, name`,
        [name, slugify(name)]
      );
      categoryIds[name] = res.rows[0].id;
    }

    console.log("Seeding venues...");
    const venues = [
      { name: "Skyline Terrace", address: "Abdali Boulevard", city: "Amman" },
      { name: "The Warehouse District", address: "Al Hurriya St", city: "Amman" },
      { name: "Dead Sea Beach Club", address: "King Hussein Rd", city: "Dead Sea" },
      { name: "Aqaba Marina Village", address: "South Beach", city: "Aqaba" },
      { name: "Paris Circle Rooftop", address: "Rainbow Street", city: "Amman" },
    ];
    const venueIds = [];
    for (const v of venues) {
      const res = await client.query(
        `INSERT INTO venues (name, address, city) VALUES ($1,$2,$3) RETURNING id`,
        [v.name, v.address, v.city]
      );
      venueIds.push(res.rows[0].id);
    }

    console.log("Seeding admin/staff/customer accounts...");
    const users = [
      { email: "admin@afterdark.jo", name: "Admin User", role: "ADMIN", password: "Admin123!" },
      { email: "staff@afterdark.jo", name: "Staff Scanner", role: "STAFF", password: "Staff123!" },
      { email: "customer@example.com", name: "Test Customer", role: "CUSTOMER", password: "Customer123!" },
    ];
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 12);
      await client.query(
        `INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (email) DO NOTHING`,
        [u.email, hash, u.name, u.role]
      );
    }

    console.log("Seeding events + ticket types...");
    const now = Date.now();
    const day = 86400000;
    const events = [
      {
        name: "Summer Night",
        category: "Electronic",
        venue: venueIds[0],
        start: new Date(now + 14 * day + 20 * 3600000),
        end: new Date(now + 14 * day + 27 * 3600000),
        description:
          "An open-air electronic showcase on Amman's most exclusive rooftop, featuring resident DJs and a curated cocktail bar under the stars.",
        rules: "No outside food or drinks. Management reserves the right of admission.",
        age: "21+",
        dress: "Smart casual, no sportswear",
        image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200",
        tiers: [
          { name: "Early Bird", price: 10, inv: 100 },
          { name: "Regular", price: 15, inv: 300 },
          { name: "VIP", price: 30, inv: 100 },
          { name: "VVIP", price: 50, inv: 30 },
        ],
      },
      {
        name: "Amman Electronic Night",
        category: "Electronic",
        venue: venueIds[1],
        start: new Date(now + 21 * day + 21 * 3600000),
        end: new Date(now + 22 * day + 3 * 3600000),
        description:
          "The city's warehouse-turned-club hosts a night of deep house and techno with an internationally touring lineup.",
        rules: "Valid ID required at entry. 18+ only.",
        age: "18+",
        dress: "All black encouraged",
        image: "https://images.unsplash.com/photo-1571266752333-af6d8ecfb62a?w=1200",
        tiers: [
          { name: "Early Bird", price: 8, inv: 150 },
          { name: "Regular", price: 12, inv: 350 },
          { name: "VIP", price: 25, inv: 80 },
        ],
      },
      {
        name: "Rooftop Sessions",
        category: "Rooftop",
        venue: venueIds[4],
        start: new Date(now + 7 * day + 19 * 3600000),
        end: new Date(now + 8 * day + 1 * 3600000),
        description:
          "Sunset-to-midnight rooftop sessions blending live saxophone, deep house, and panoramic views over Rainbow Street.",
        rules: "Reservations recommended. Smart casual dress code enforced.",
        age: "18+",
        dress: "Smart casual",
        image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200",
        tiers: [
          { name: "Regular", price: 15, inv: 200 },
          { name: "VIP", price: 35, inv: 60 },
        ],
      },
      {
        name: "Midnight Festival",
        category: "Festival",
        venue: venueIds[2],
        start: new Date(now + 45 * day + 18 * 3600000),
        end: new Date(now + 46 * day + 4 * 3600000),
        description:
          "A full-night beachfront festival on the shores of the Dead Sea — three stages, international headliners, and a sunrise closing set.",
        rules: "Camping area available. No glass containers on the beach.",
        age: "18+",
        dress: "Festival wear",
        image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200",
        tiers: [
          { name: "Early Bird", price: 20, inv: 400 },
          { name: "Regular", price: 30, inv: 800 },
          { name: "VIP", price: 60, inv: 150 },
          { name: "VVIP", price: 100, inv: 40 },
        ],
      },
      {
        name: "Sunset Party",
        category: "Exclusive",
        venue: venueIds[3],
        start: new Date(now + 10 * day + 17 * 3600000),
        end: new Date(now + 10 * day + 23 * 3600000),
        description:
          "An exclusive marina-side sunset party in Aqaba with a members-only guest list feel — limited capacity, premium bar service.",
        rules: "Guest list capped at 200. Age verification strictly enforced.",
        age: "21+",
        dress: "Resort chic",
        image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200",
        tiers: [
          { name: "Regular", price: 20, inv: 120 },
          { name: "VIP", price: 45, inv: 50 },
          { name: "VVIP", price: 75, inv: 20 },
        ],
      },
    ];

    for (const ev of events) {
      const slug = slugify(ev.name);
      const res = await client.query(
        `INSERT INTO events
          (slug, name, description, rules, age_restriction, dress_code, cover_image_url,
           category_id, venue_id, start_date, end_date, is_published, seo_title, seo_description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, TRUE, $12, $13)
         ON CONFLICT (slug) DO NOTHING
         RETURNING id`,
        [
          slug,
          ev.name,
          ev.description,
          ev.rules,
          ev.age,
          ev.dress,
          ev.image,
          categoryIds[ev.category],
          ev.venue,
          ev.start.toISOString(),
          ev.end.toISOString(),
          `${ev.name} Tickets | Afterdark.jo`,
          ev.description.slice(0, 150),
        ]
      );
      let eventId = res.rows[0]?.id;
      if (!eventId) {
        const existing = await client.query(`SELECT id FROM events WHERE slug = $1`, [slug]);
        eventId = existing.rows[0].id;
      } else {
        let sort = 0;
        for (const tier of ev.tiers) {
          await client.query(
            `INSERT INTO ticket_types (event_id, name, description, price, total_inventory, sort_order)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [
              eventId,
              tier.name,
              `${tier.name} admission to ${ev.name}`,
              tier.price.toFixed(2),
              tier.inv,
              sort++,
            ]
          );
        }
      }
    }

    console.log("Seeding site settings...");
    await client.query(
      `UPDATE site_settings SET
        business_name = 'Afterdark.jo',
        cliq_alias = 'AFTERDARKJO',
        payment_instructions = 'Open your banking app, transfer the exact amount via CliQ to the alias above, then confirm below.',
        support_phone = '+962 7 9999 0000',
        support_email = 'support@afterdark.jo',
        reservation_minutes = 15
       WHERE id = 1`
    );

    await client.query("COMMIT");
    console.log("Seed complete.");
    console.log("Admin login:    admin@afterdark.jo / Admin123!");
    console.log("Staff login:    staff@afterdark.jo / Staff123!");
    console.log("Customer login: customer@example.com / Customer123!");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
