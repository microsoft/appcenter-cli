# Known issues

Here is a list of a few known issues, and how to solve them.

## Out of memory with very large test sets

When running tests with very large sets, merging the output XML can fail because of an out of memory issue.
Here's an example of how the Node VM would crash:

```
[...]
<--- Last few GCs --->

[871:0x103800000]  7497216 ms: Mark-sweep 739.0 (776.7) -> 739.0 (745.2) MB, 149.2 / 0.1 ms  (average mu = 0.838, current mu = 0.002) last resort GC in old space requested
[871:0x103800000]  7497353 ms: Mark-sweep 739.0 (745.2) -> 739.0 (745.2) MB, 136.9 / 0.1 ms  (average mu = 0.724, current mu = 0.002) last resort GC in old space requested


<--- JS stacktrace --->

==== JS stack trace =========================================

    0: ExitFrame [pc: 0x76bc67dbe3d]
Security context: 0x218e3579e6e9 <JSObject>
    1: DoJoin(aka DoJoin) [0x218e35785e91] [native array.js:~87] [pc=0x76bc6ae5098](this=0x218efee026f1 <undefined>,l=0x218efbff9ba9 <JSArray[417455]>,m=417455,A=0x218efee028c9 <true>,w=0x218efee029f1 <String[0]: >,v=0x218efee029a1 <false>)
    2: Join(aka Join) [0x218e35785ee1] [native array.js:1] [bytecode=0x218e357c9c61 offset=71](this=0x218efee026f1 <unde...

FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory
 1: 0x10003cf99 node::Abort() [/usr/local/bin/node]
 2: 0x10003d1a3 node::OnFatalError(char const*, char const*) [/usr/local/bin/node]
 3: 0x1001b7835 v8::internal::V8::FatalProcessOutOfMemory(v8::internal::Isolate*, char const*, bool) [/usr/local/bin/node]
 4: 0x100585682 v8::internal::Heap::FatalProcessOutOfMemory(char const*) [/usr/local/bin/node]
 5: 0x10058eb84 v8::internal::Heap::AllocateRawWithRetryOrFail(int, v8::internal::AllocationSpace, v8::internal::AllocationAlignment) [/usr/local/bin/node]
 6: 0x100560974 v8::internal::Factory::NewRawTwoByteString(int, v8::internal::PretenureFlag) [/usr/local/bin/node]
 7: 0x10083982d v8::internal::Runtime_StringBuilderConcat(int, v8::internal::Object**, v8::internal::Isolate*) [/usr/local/bin/node]
 8: 0x76bc67dbe3d
 9: 0x76bc6ae5098
/Users/vsts/agent/2.155.1/work/_temp/4356c817-b5e2-415e-b511-295054eeaf84.sh: line 28:   871 Abort trap: 6           
[...]
```

To solve this, increase the VM's "old space" size:
```bash
export NODE_OPTIONS=--max_old_space_size=4096
```
