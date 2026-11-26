#pragma once
#include "RakClientInterface.h"

class NetGame {
public:
    bool Initialize() { return true; }
    void Shutdown() {}
    void Poll() {}
};
