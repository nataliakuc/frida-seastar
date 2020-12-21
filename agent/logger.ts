export function log(message: string): void {
    console.log(message);
}
export function thread_id(): number {
    return Process.getCurrentThreadId()
}
export function log_tid(message: string): void {
    log(`tid=${thread_id()}: ${message}`)
}
const file_loggers: any = {};
//const file_logger = new File("log.json", "w");
export function file_log(message: string): void {
    if (!(thread_id() in file_loggers)) {
        file_loggers[thread_id()] = new File(`log.${thread_id()}.json`, "w")
    }
    const logger = file_loggers[thread_id()] as File
    logger.write(message + "\n")
}
export function file_log_json(obj: any): void {
    file_log(JSON.stringify(obj))
}
