import { OpenStackClient } from './client';

/**
 * Read clouds.yaml file and extract fields based on auth_type.
 * @param {string} filePath - Path to the clouds.yaml file.
 * @param {string} cloudName - Name of the cloud configuration to extract.
 * @returns {null} - The OpenStackClient
 */
export async function createClient(filePath: string, cloudName: string): Promise<OpenStackClient | null> {
  const client = new OpenStackClient(filePath, cloudName);
  await client.generateToken();
  return client;
}

const main = async () => {
  const client = await createClient('/home/gridexx/Documents/Mezo/openstack-js-sdk/clouds.yaml', 'openstack');
  client?.getServer('e29b3957-f8c2-46d2-9397-2eb266adfb5c').then((ser) => {
    {
      console.log(JSON.stringify(ser));
    }
  });
  client?.getLimits().then((im) => {
    console.log(JSON.stringify(im));
  });
};

main();
