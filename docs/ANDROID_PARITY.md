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
- Swift 6.1.3 builds the shared core on Ubuntu WSL. All 7 XCTest cases pass:
  framing, malformed packets, path restrictions, Thai wire bytes, SAMP status
  parsing, voice checksum and a real Opus audio round trip.
- The independent native Opus round trip passes (547-byte packet / 4800 decoded
  samples at 48 kHz mono, 40 kbps and 100 ms).
- The vendored authentication SHA-1 used 64-bit words on 64-bit hosts and wrong
  padding for some input lengths. It now uses 32-bit words and passes 14 independent
  hashlib reference vectors, including lengths 55, 56, 63 and 64.
- RakNet bit readers/copy previously read and incremented the same offset in one
  expression. Offset operations are now sequenced; tests pass all 64 source/destination
  alignment combinations and both boolean-reader paths.
- iOS app Swift syntax parses successfully. Xcode builds, UIKit/SwiftUI type checking,
  device execution and simulator visual checks still require a Mac.

## Account blocker

Workflow `ios-build.yml` is `active`; enabling the workflow again is not the fix.
GitHub dispatch returned `HTTP 422: Actions has been disabled for this user.`
Resolve the GitHub account restriction, then run `iOS App and IPA` on `main`.
Do not claim a successful app build, installable IPA, multiplayer login, radio,
microphone networking or 3D gameplay before their respective tests actually pass.
