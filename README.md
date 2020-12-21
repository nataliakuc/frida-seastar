### How to compile & load

```sh
$ git clone git://github.com/oleavr/frida-agent-example.git
$ cd frida-seastar/
$ npm install
$ frida -l _agent.js --no-pause ./example_application
```

### Development workflow

To continuously recompile on change, keep this running in a terminal:

```sh
$ npm run watch
```

And use an editor like Visual Studio Code for code completion and instant
type-checking feedback.

Required: compile libcppfilt module with
```
bash make_cppfilt
```
and insert compiled shared library path into file `agent/demangler.ts`
