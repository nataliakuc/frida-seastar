import { log } from "./logger";

let known_tasks: any = {}

function thread_id() {
    return Process.getCurrentThreadId();
}

function log_tid(msg: string) {
    log(`tid=${thread_id()}: ${msg}`)
}

const semaphore_symbols = DebugSymbol.findFunctionsMatching('_ZN7seastar15basic_semaphoreINS_35semaphore_default_exception_factoryENSt6chrono3_V212steady_clock*')
const current_task_sym = DebugSymbol.fromName("_ZNK7seastar7reactor12current_taskEv").address;
const current_task_fun = new NativeFunction(current_task_sym, 'pointer', ['pointer']);
const reactor_creation = DebugSymbol.findFunctionsMatching('_ZN7seastar7reactor*reactor_backend_selectorENS_14reactor_configE');

let tid_to_reactor_address: Record<number, NativePointer> = {};

reactor_creation.map(fun => {
    let sym = DebugSymbol.fromAddress(fun);
    Interceptor.attach(fun, {
        onEnter(args) {
            tid_to_reactor_address[thread_id()] = args[0];
            log_tid(`Reactor created: addr=${args[0]}, id=${args[1].toInt32()}`)
        }
    })
})

function get_current_task(): NativePointer {
    const current_reactor: NativePointer = tid_to_reactor_address[thread_id()]
    return <NativePointer>current_task_fun(current_reactor)
}

semaphore_symbols.map((fun) => {
    let sym = DebugSymbol.fromAddress(fun);
    if (sym.name != null) {
        const name: string = sym.name;
        if (name.match(/.*(signal|wait).*/)) {
            Interceptor.attach(fun, {
                onEnter(args) {
                    if (!(name.match(/.*signal.*/) && args[1].toInt32() == 0)) {
                        const ctsk = get_current_task()
                        log_tid(`${sym.name} called, task is ${ctsk}`);
                        //log('called from:');
                        //log(Thread.backtrace(this.context, Backtracer.ACCURATE).map(DebugSymbol.fromAddress).join('\n'));
                        //log('\n');
                    }
                }
            })
        }
    }
})

const run_and_dispose = DebugSymbol.findFunctionsMatching("*run_and_dispose*")

run_and_dispose.map(fun => {
    Interceptor.attach(fun, {
        onEnter(args) {
            const task_ptr = args[0];
            const vtable = task_ptr.readPointer();
            const symbol = DebugSymbol.fromAddress(vtable);
            log(`tid=${thread_id()}: entering task ${task_ptr}`);
            if (task_ptr.toString() in known_tasks) {
                log(`-- ${task_ptr} in known_tasks`)
            }
            known_tasks[task_ptr.toString()] = 2;
        }
    })
})
