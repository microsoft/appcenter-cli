# Overview

Visual Studio App Center among other features offers App Center Distribute. It is a tool for developers to quickly release builds to end user devices. Developers need to upload release builds to distribute through App Center.

This library is a shared piece of our uploader node clients. It leverages App Center File Upload Service and allows uploading many chunks (slices of a release binary) in parallel. It takes the binary file, slices it in 4mb chunks, and uploads them simultaneously.

The main benefits of that approach:

* Uploading speed can be ten times faster for high latency connections.
* Smart retry mechanism: the retries are made on a per-chunk basis.

## Testing

Run `npm run test`
