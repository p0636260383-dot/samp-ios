# Current port status

Updated: 27 November 2026 (Asia/Bangkok).

## Implemented in source

- iPhone/iPad app project specification and SwiftUI launcher.
- Same server configuration as Android and native SA-MP status query.
- Exact Android UI snapshot: 684 files / 39 registry entries.
- WKWebView host and compatible `/dweb` protocol, Thai encoding and tests.
- Native microphone capture, local Opus encoding, SampVoice packet codec and tests.
- macOS simulator/device build, unsigned IPA artifact and screenshot workflow.

## Verified locally

- UI asset size/hash and registry integrity checks passed.
- ARM64 syntax checks passed for 137 Opus C sources using installed Android NDK.
- Installed Swift 6.1.3 and C/C++ development tools in the existing Ubuntu WSL.
- Shared core builds and all 7 Swift XCTest cases pass on Linux.
- Real Opus encode/decode round trip passes: 48000 Hz mono, 40000 bps, 100 ms,
  547 encoded bytes and 4800 decoded samples.
- Authentication SHA-1 matches Python hashlib for 14 vectors, including padding
  boundaries. Fixed incorrect 64-bit word selection and padding arithmetic.
- RakNet bit-reader/copy regression tests pass for 64 alignment combinations.
  Fixed unsequenced offset reads/increments in the vendored bitstream.
- All iOS app Swift files pass parser checks; this is not an Xcode type/link check.
- Git whitespace checks passed.

## External blockers / unverified work

- GitHub Actions is disabled at the account level. Dispatch returns HTTP 422,
  `Actions has been disabled for this user.` Workflow state itself is `active`.
- No local macOS/Xcode. iOS type checking/linking, simulator smoke tests and IPA
  production have not been verified. Linux shared-core tests are now available.
- Supplied ROTCITY directory is an open.mp/Pawn server, with no iOS game engine.
- Game engine/rendering, world sync, touch controls, mod loader, live SampVoice
  negotiation/playback/radio and RPC-to-UI integration remain unimplemented.
- No Apple provisioning identity supplied. An unsigned IPA needs signing before
  installation. No certificate or provisioning profile was fabricated.

Restore Actions or provide a working Mac, run the configured build/tests, and fix
any compiler/runtime failures before distributing an IPA. See
[compatibility evidence](docs/ANDROID_PARITY.md) for source-level contracts.
