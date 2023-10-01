import pino from "pino";
import { configuration } from "../../configurations/Configurator";

export const logger = pino({
    level: configuration.logging.level || 'info',
    timestamp: () => `,"timestamp":"${new Date(Date.now()).toISOString()}"`,
})