import { injectable } from 'inversify';

export interface Logger {
    info(message: string): void;
    error(message: string): void;
    warn(message: string): void;
    debug(message: string): void;
}

@injectable()
export class ConsoleLogger implements Logger {
    public info(message: string): void {
        console.log(`[INFO] ${message}`);
    }

    public error(message: string): void {
        console.error(`[ERROR] ${message}`);
    }

    public warn(message: string): void {
        console.warn(`[WARN] ${message}`);
    }

    public debug(message: string): void {
        console.debug(`[DEBUG] ${message}`);
    }
} 