# TASKS.md

## Phase 1 - Source Audit
- [x] Inspect `ios-base`
- [x] Inspect `android-base`
- [x] Inspect `network-reference`
- [x] Inspect `SAMP-Mobile-GTA-2.11`

## Phase 2 - iOS Scaffold
- [x] Create directory structure
- [x] Create platform abstraction interfaces
- [x] Add XcodeGen iPhone/iPad app project specification
- [x] Port platform-independent network/RPC core (`SampSession` / `SampClient`: RakNet handshake, `ID_AUTH_KEY`, `RPC_ClientJoin`, `RPC_InitGame`, `RPC_ClientMessage` `@DUI@`, `RPC_ShowDialog`, `RPC_Chat`, `RPC_ServerCommand`, `RPC_DialogResponse`)
- [ ] Implement rendering/input/audio on iOS (3D GTA engine pending; live `/dweb` UI, chat, dialog, and mic capture wired in `GameSessionView`)
- [ ] Verify ARM64 build in GitHub Actions

## Phase 3 - Android parity foundations
- [x] Import and hash-check 684 Android UI files (39 registered pages)
- [x] Implement WKWebView host and /dweb framing with Windows-874 Thai
- [x] Add native microphone capture and Android Opus source codec
- [x] Add SampVoice v11 packet serializer/parser and compatibility test suites
- [x] Configure unsigned IPA artifact and iPhone/iPad simulator smoke workflow
- [x] Run 10 Swift shared-core tests on Ubuntu WSL (including `SampClientTests`)
- [x] Run native Opus, SHA-1 reference and RakNet bit-alignment regression tests
- [x] Fix auth word size/padding and unsequenced RakNet bit offsets
- [ ] Restore account-level GitHub Actions access
- [ ] Run Swift tests, Xcode build and simulator screenshots successfully
- [ ] Supply/integrate iOS GTA engine and gameplay sync
- [ ] Connect live SampVoice controls, spatial playback and radio streams
- [ ] Load game mods through an iOS-compatible renderer/asset pipeline
- [ ] Sign with a real Apple development identity and test on devices
