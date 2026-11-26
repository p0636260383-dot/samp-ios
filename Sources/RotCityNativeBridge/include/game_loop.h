#pragma once

class Renderer { public: bool Initialize(){return true;} void Shutdown(){} void Present(){} };
class Input { public: void Poll(){} };
class Audio { public: bool Initialize(){return true;} void Shutdown(){} };
