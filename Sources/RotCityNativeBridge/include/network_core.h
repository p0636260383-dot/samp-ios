#pragma once

// Minimal placeholder for future SA-MP network/RPC core porting.
// No protocol implementation yet.

class NetworkCore {
public:
    bool Initialize() { return true; }
    void Shutdown() {}
    void Poll() {}
};
