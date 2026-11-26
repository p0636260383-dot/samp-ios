# Android / server compatibility evidence

Source inspected: `SAMP-Mobile-GTA-2.11/app/src/main` and the user-supplied
`ROTCITY/gamemodes` server source. No server credentials or database files were copied.

| Contract | Existing implementation | iOS implementation / limitation |
| --- | --- | --- |
| Server address | `java/com/gta/launcher/activity/MainActivity.java` | `ServerConfiguration.rotCity`: same host, UDP port 6160 |
| UI assets | `assets/rot-ui/pages.json`, 39 entries | Exact copied assets; per-file SHA-256 in `iOS/Resources/android-ui-manifest.json` |
| UI inbound | `RotGameUi.java`, server `rotcity_mobile_ui.inc` | `MobileUIProtocol` parses +/= fragments, A/R/C/H/F/E frames |
| UI outgoing | `/dweb !`, +/= chunks of at most 108 chars | Same framing and Windows-874 encoding; awaits live session sender |
| UI transport | `@DUI@` client messages or dialog 65000 / title `@DUI@` | Future SA-MP RPC adapter must call `MobileUIController.receive` |
| Thai text | UTF-8 fallback to Windows-874 | Explicit codec, known-byte test for สวัสดี |
| Voice PCM | `RotVoiceRecorder.java`: 48000 Hz, mono, signed PCM16, 960-sample chunks | AVAudioConverter output, accumulates 4800 samples per Opus frame |
| Voice server | `rotcity_voice.inc`: `SvInit(40000)`, local key 0x42, admin key 0xBB, range 40 m | Codec default 40000; session/keys/spatial routing still required |
| SampVoice | `voice/Header.h`, `VoicePacket.h`, `VoicePacket.cpp` | Signature 0xDEADBEEF, version 11, packed 24-byte header, CRC32C over header bytes 4...23 |
| Game runtime | `samp/main.cpp` searches `libGame.so` / `libsamp.so`; CMake links Android, EGL, GLESv3, BASS/GlossHook | No compatible iOS game runtime supplied; cannot directly link these Android binaries |
| Models/mods | Supplied server `models` directory is empty | No model assets to port from that directory; renderer/asset loader remain required |

## Local validation

- All 684 Android UI files matched the recorded size and SHA-256.
- All 39 registered page documents exist.
- All 137 shared Opus C files (136 vendor + wrapper) passed ARM64 syntax checking
  using the existing Android NDK 30 compiler. This is not an iOS compile or runtime test.
- Swift XCTest suites cover framing, malformed packets, path restrictions, Thai wire
  bytes, SAMP status parsing, voice checksum, and an Opus audio round trip. They have
  **not run** because Swift/Xcode are unavailable locally and GitHub Actions is blocked.

## Account blocker

Workflow `ios-build.yml` is `active`; enabling the workflow again is not the fix.
GitHub dispatch returned `HTTP 422: Actions has been disabled for this user.`
Resolve the GitHub account restriction, then run `iOS App and IPA` on `main`.
Do not claim a successful app build, installable IPA, multiplayer login, radio,
microphone networking or 3D gameplay before their respective tests actually pass.
