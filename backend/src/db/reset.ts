import { resetToCleanAdminState } from './database';

console.log('🚀 Running production database wipe and reset...');
resetToCleanAdminState();
console.log('🎉 Done! Ready for production.');
process.exit(0);
