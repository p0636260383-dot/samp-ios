#pragma once

class IRenderer {
public:
    virtual ~IRenderer() = default;
    virtual bool Initialize() = 0;
    virtual void Shutdown() = 0;
    virtual void Present() = 0;
};

class IInput {
public:
    virtual ~IInput() = default;
    virtual void Poll() = 0;
};

class IAudio {
public:
    virtual ~IAudio() = default;
    virtual bool Initialize() = 0;
    virtual void Shutdown() = 0;
};
