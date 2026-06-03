import { getAccessToken } from './src/lib/onedrive';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
  const token = await getAccessToken();
  console.log('Token:', token ? 'Success' : 'Failed');
}
check();
