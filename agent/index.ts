import { log, log_tid, thread_id, file_log_json } from "./logger"
import { demangle } from "./demangler"

function sem_dtor(name: string, args: NativePointer[]) {
    file_log_json({
        event: "sem_dtor", 
        address: args[0],
        sym_name: name,
    })
}
function sem_ctor(name: string, args: NativePointer[]) {
    if (name.match(/.*\(unsigned long.*\)/)) {
        file_log_json({
            event: "sem_ctor", 
            address: args[0],
            sym_name: name, 
            units: args[1],
        })
    } else if (name.match(/.*&&\)/)) {
        file_log_json({
            event: "sem_move_ctor", 
            address: args[0],
            sym_name: name,
            move_from: args[1]
        })
    } else {
        file_log_json({
            event: "sem_move_unknown", 
            address: args[0],
            sym_name: name,
        })
    }
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
        units: units
    })
}

function sem_signal(name: string, args: NativePointer[]) {
    file_log_json({
        event: "sem_signal",
        address: args[0],
        sym_name: name,
        units: args[1]
    })
}

const semaphore_symbols = DebugSymbol.findFunctionsMatching('_ZN7seastar15basic_semaphore*')
semaphore_symbols.map(fun => {
    const sym = DebugSymbol.fromAddress(fun)
    if (sym.name == null) {
        return
    }

    const name: string = demangle(sym.name)
    let handler: (name: string, args: NativePointer[]) => void
    if (name.match(/.*::basic_semaphore\(.*\)/)) {
        handler = sem_ctor
    }
    else if (name.match(/.*::~basic_semaphore\(\)/)) {
        handler = sem_dtor
    } else if (name.match(/.*::(try_)?wait\(.*\)/)) {
        handler = sem_wait
    } else if (name.match(/.*::signal\(unsigned long\)/)) {
        handler = sem_signal
    } else {
        return
    }
    log(name)

    Interceptor.attach(fun, {
        onEnter(args) {
            handler(name, args)
        }
    })
})
