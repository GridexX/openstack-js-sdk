import { OpenStackClient } from './client';

// This will allow us to add the OpenStackClient to the Express app.locals object
declare global {
  namespace Express {
    interface Locals {
      openStackClient: OpenStackClient;
    }
  }
}
