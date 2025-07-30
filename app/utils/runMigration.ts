import { migrateRoomsToParticipants } from '../utils/roomParticipants';

/**
 * Run this script once to migrate existing chat rooms to include participants field
 * This is required for the new Firestore security rules
 */
export const runMigration = async () => {
  try {
    console.log('🚀 Starting migration process...');
    await migrateRoomsToParticipants();
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
};

// Auto-run migration if this file is imported
runMigration();
