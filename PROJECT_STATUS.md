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
- Git whitespace checks passed.

## External blockers / unverified work

- GitHub Actions is disabled at the account level. Dispatch returns HTTP 422,
  `Actions has been disabled for this user.` Workflow state itself is `active`.
- No local macOS/Xcode/Swift toolchain. Swift tests, iOS linking, simulator smoke
  tests and IPA production have not been verified.
- Supplied ROTCITY directory is an open.mp/Pawn server, with no iOS game engine.
- Game engine/rendering, world sync, touch controls, mod loader, live SampVoice
  negotiation/playback/radio and RPC-to-UI integration remain unimplemented.
- No Apple provisioning identity supplied. An unsigned IPA needs signing before
  installation. No certificate or provisioning profile was fabricated.

Restore Actions or provide a working Mac, run the configured build/tests, and fix
any compiler/runtime failures before distributing an IPA. See
[compatibility evidence](docs/ANDROID_PARITY.md) for source-level contracts.
