
const cppfilt_module = Module.load("/home/enedil/Dokumenty/mimuw/zpp/frida-seastar/libcppfilt.so")
const cppfilt = cppfilt_module.getExportByName("cppfilt")
const cppfilt_fun = new NativeFunction(cppfilt, 'int', ['pointer', 'pointer', 'int'])
export function demangle(name: string) {
    const input = Memory.allocUtf8String(name)
    const output = Memory.alloc(name.length * 5)
    const ret = cppfilt_fun(input, output, name.length * 5)
    if (ret == 0) {
        throw "Cannot spawn c++filt or reading failed"
    }
    return <string>output.readCString();
}

