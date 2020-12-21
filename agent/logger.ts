export function log(message: string): void {
    console.log(message);
}
export function thread_id(): number {
    return Process.getCurrentThreadId()
}
export function log_tid(message: string): void {
    log(`tid=${thread_id()}: ${message}`)
}
const file_logger = new File("log.json", "w");
export function file_log(message: string): void {
    file_logger.write(message + "\n")
}
export function file_log_json(obj: any): void {
    file_log(JSON.stringify(obj))
}
