import { log, log_tid, thread_id, file_log_json } from "./logger"
import { demangle } from "./demangler"

function timestamp() {
    return Date.now()
}

let waiters_fun: NativeFunction;

function sem_dtor(name: string, args: NativePointer[]) {
    file_log_json({
        event: "sem_dtor", 
        address: args[0],
        sym_name: name,
        timestamp: timestamp()
    })
    return args[0]
}
function sem_ctor(name: string, args: NativePointer[]) {
    const ret: any = {
        address: args[0],
        sym_name: name,
        timestamp: timestamp(),
    }
    if (name.match(/.*\(unsigned long.*\)/)) {
        ret["event"] = "sem_ctor"
        ret["units"] = args[1]
    } else if (name.match(/.*&&\)/)) {
        ret["event"] = "sem_move_ctor"
        ret["move_from"] = args[1]
    } else {
        ret["event"] = "sem_move_unknown"
    }
    file_log_json(ret)
    return args[0]
}

function sem_wait(name: string, args: NativePointer[]) {
    let units: NativePointer = new NativePointer("0x0")
    if (name.match(/.*\(unsigned long.*/)) {
        units = args[2];
    } else if (name.match(/.*\(.*, unsigned long\)/)) {
        units = args[3];
    }
    file_log_json({
        event: "sem_wait",
        address: args[1],
        sym_name: name,
        units: units,
        timestamp: timestamp(),
        waiters: waiters_fun(args[1])
    })
    return args[1]
}

function sem_signal(name: string, args: NativePointer[]) {
    file_log_json({
        event: "sem_signal",
        address: args[0],
        sym_name: name,
        units: args[1],
        timestamp: timestamp(),
        waiters: waiters_fun(args[0])
    })
    return args[0]
}

const syscall_work_queue_addresses: any = {};

const semaphore_symbols = 
    DebugSymbol.findFunctionsMatching('_ZN7seastar15basic_semaphore*').concat(DebugSymbol.findFunctionsMatching('_ZNK7seastar15basic_semaphore*'))
semaphore_symbols.map(fun => {
    const sym = DebugSymbol.fromAddress(fun)
    if (sym.name == null) {
        return
    }

    const name: string = demangle(sym.name)
    if (name.match(/.*::waiters\(\).*/)) {
        waiters_fun = new NativeFunction(fun, 'pointer', ['pointer'])
        return
    }

    let enter_handler: (name: string, args: NativePointer[]) => void
    if (name.match(/.*::basic_semaphore\(.*\)/)) {
        enter_handler = sem_ctor
    } else if (name.match(/.*::~basic_semaphore\(\)/)) {
        enter_handler = sem_dtor
    } else if (name.match(/.*::(try_)?wait\(.*,.*\)/)) {
        enter_handler = sem_wait
    } else if (name.match(/.*::signal\(unsigned long\)/)) {
        enter_handler = sem_signal
    } else {
        //log(name)
        return
    }

    Interceptor.attach(fun, {
        onEnter(args) {
            const bt = Thread.backtrace(this.context, Backtracer.ACCURATE)
            if (bt[0].toString() in syscall_work_queue_addresses) {
                return
            }
            const caller = DebugSymbol.fromAddress(bt[0])
            if (caller != null && caller.name != null && caller.name.match(/syscall_work_queue/)) {
                syscall_work_queue_addresses[bt[0].toString()] = true
                return
            }
            this.semaphore = enter_handler(name, args)
        },
        onLeave(retval) {
            const bt = Thread.backtrace(this.context, Backtracer.ACCURATE)
            if (bt[0].toString() in syscall_work_queue_addresses) {
                return
            }

            file_log_json({
                event: "finished",
                address: this.semaphore,
                timestamp: timestamp(),
                waiters: waiters_fun(this.semaphore)
            })
        }
    })
})
