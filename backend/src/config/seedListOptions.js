const ListOption = require('../models/ListOption');

const DEFAULTS = {
  designPlanning: ['LTH-Met', 'Candy', 'Mag-case', 'I-Paky', 'Fusion Case', 'Converter Case', 'New IMD'],
  master: ['IP-Block', 'HH-China', 'Gr-Block', 'Single Block'],
};

// Idempotent — only inserts values that don't already exist for that type.
const seedListOptions = async () => {
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
