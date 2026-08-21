const ListOption = require('../models/ListOption');
const Notification = require('../models/Notification');

const DEFAULTS = {
  designPlanning: ['LTH-Met', 'Candy', 'Mag-case', 'I-Paky', 'Fusion Case', 'Converter Case', 'New IMD'],
  master: ['IP-Block', 'HH-China', 'Gr-Block', 'Single Block'],
};

// Builds indexes for models that have autoIndex disabled, with a hard timeout so a slow/blocked
// Atlas index build can never hang a live request (previously the compound unique index on
// ListOption would build lazily on first query and could stall that request indefinitely).
const buildIndexesSafely = async (model, label) => {
  try {
    await Promise.race([
      model.syncIndexes(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timed out')), 8000)),
    ]);
    console.log(`Indexes ready: ${label}`);
  } catch (err) {
    console.error(`⚠️  Could not build indexes for ${label} (continuing without blocking startup): ${err.message}`);
  }
};

// Idempotent — only inserts values that don't already exist for that type.
const seedListOptions = async () => {
  await buildIndexesSafely(ListOption, 'ListOption');
  buildIndexesSafely(Notification, 'Notification'); // not awaited — no unique constraint, fine to build in background

  for (const [type, values] of Object.entries(DEFAULTS)) {
    for (const value of values) {
      try {
        await ListOption.updateOne(
          { type, value },
          { $setOnInsert: { type, value, createdByName: 'System' } },
          { upsert: true }
        );
      } catch (err) {
        // Ignore duplicate-key races; nothing else to do
        if (err.code !== 11000) console.error(`List option seed error (${type}/${value}):`, err.message);
      }
    }
  }
};

module.exports = seedListOptions;
