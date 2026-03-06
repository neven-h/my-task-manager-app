export default class ConsoleLogger {
    info(message, meta) {
        console.info('[Storage]', message, meta ?? '');
    }

    warn(message, meta) {
        console.warn('[Storage]', message, meta ?? '');
    }

    error(message, meta) {
        console.error('[Storage]', message, meta ?? '');
    }
}
