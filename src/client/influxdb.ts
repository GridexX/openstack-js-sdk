import { InfluxDB, Point } from "@influxdata/influxdb-client";
import { format } from "date-fns";
import { multistream } from "pino";
import createWriteStream from 'pino-pretty';
import pino from "pino";
import http from "http";
import path from 'path';
import fs from 'fs';

const influxdb_token = process.env.INFLUXDB_TOKEN ?? '';
const influxdb_url = process.env.INFLUXDB_URL ?? '';
const influxdb_org = process.env.INFLUXDB_ORG ?? '';
const influxdb_bucket = process.env.INFLUXDB_BUCKET ?? '';
const openstack_url = process.env.OS_URL ?? '';

const client = new InfluxDB({url: influxdb_url, token: influxdb_token});

const today = format(new Date(), 'yyyy-MM-dd');

const logsDir = path.resolve(__dirname, '..', '..', '..', 'logs'); 
const logFilePath = path.join(logsDir, `${today}.log`);

const prettyStream = createWriteStream({
    destination: logFilePath,
    translateTime: true,
    ignore: 'pid,hostname'
});

const streams = [
    { stream: prettyStream }
]

const logger = pino({}, multistream(streams))

if (!fs.existsSync(logsDir)) {
    try {
        fs.mkdirSync(logsDir, { recursive: true });
        logger.info(`Dossier ${logsDir} créé avec succès.`);
    } catch (err) {
        logger.error(`Erreur lors de la création du dossier ${logsDir} : ${err}`);
    }
}

export const writeData = async () => {
    let metrics, writeClient;
    try {
        writeClient = client.getWriteApi(influxdb_org, influxdb_bucket, 'ns');
        logger.info("Création du client InfluxDB réussie")
    } catch (error : any) {
        logger.error("Erreur lors de la création du client : " + error.message)
    }

    try {
        metrics = await fetch(`${openstack_url}/metrics`).then((result) => result.json());
        
        logger.info("Récupération des données réussie")
    } catch (error: any) {
        logger.error("Erreur lors de la création de la récupération des données : " + error.message)
    }

    let points: any[] = [];

    for (const metric of metrics){
        let vcpu = new Point('vcpu')
            .tag('max', "10")
            .intField('value', "2");

        let ram = new Point('ram')
            .tag('max', "213423421")
            .intField('value', "21321");
            
        let disk = new Point('disk')
            .tag('max', "40023902319")
            .intField('value', "42302319");

        points = points.concat([vcpu, ram, disk])
    }

    if (writeClient) {
        try {
            writeClient.writePoints(points)
            logger.info("Ecriture des données réussie")
        } catch (error: any) {
            logger.error("Erreur lors de l'écriture dans InfluxDB : " + error.message)
        }

        try {
            writeClient.close()
            logger.info("Fermeture du client réussie")
        } catch (error: any) {
            logger.error("Erreur lors de la fermeture du client : " + error.message)
        }
    }
}

export const deleteData = async () => {
    const start = '1970-01-01T00:00:00Z';
    const stop = '2040-10-30T00:00:00Z';

    const deleteApi = async (predicate: string) => {
        const url = `${influxdb_url}/api/v2/delete?org=${influxdb_org}&bucket=${influxdb_bucket}`;
        logger.info(url)
        const headers = {
            'Authorization': `Token ${influxdb_token}`,
            'Content-Type': 'application/json',
        };

        const body = JSON.stringify({
            start,
            stop,
            predicate
        });

        return new Promise((resolve, reject) => {
            const req = http.request(url, {
              method: 'POST',
              headers,
            });
      
            req.on('response', (res) => {
              let data = '';
              res.on('data', (chunk) => {
                data += chunk;
              });
      
              res.on('end', () => {
                if (res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300) {
                  resolve(data);
                } else {
                  reject(new Error(`Erreur lors de la requête : ${res.statusCode}`));
                }
              });
            });
      
            req.on('error', (err) => {
              reject(err);
            });
      
            req.write(body);
            req.end();
          });
    }

    try {
        await deleteApi('_measurement="vcpu"')
        await deleteApi('_measurement="ram"')
        await deleteApi('_measurement="disk"')
        logger.info("Suppression des données réussie")
    } catch (error : any) {
        logger.error(`Echec de la suppression des données : ${error.message}`)
    }
}

