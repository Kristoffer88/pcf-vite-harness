import { setupDataverse } from 'dataverse-utilities/testing';
import 'dotenv/config';

await setupDataverse({
  dataverseUrl: process.env.DATAVERSE_URL || 'https://yourorg.crm4.dynamics.com'
});