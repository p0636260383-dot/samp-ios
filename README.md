# ROT CITY for iPhone / iPad

iOS app source targeting the same ROT CITY server as the Android launcher:
`diamond1412.thddns.net:6160`.

**This is a port in progress, not a playable GTA/SA-MP client. No successful IPA
build has been verified.** The macOS Actions build is currently blocked by GitHub's
account-level response: `HTTP 422: Actions has been disabled for this user.`

## Implemented

- iPhone/iPad landscape SwiftUI launcher and native UDP SA-MP server-info query.
- 684 byte-identical Android UI assets, with 39 registered screens in WKWebView.
- Android `/dweb` framing, UI events, fragmentation, Windows-874 Thai encoding,
  page visibility/focus, bounded event queues and bundle-only page navigation.
- AVAudioEngine microphone permission/capture and conversion to 48 kHz mono PCM.
- The Android source's Opus codec built from portable C, using 100 ms frames,
  FEC and the server's 40 kbps default. The microphone test encodes locally.
- SampVoice v11 connect extension and 24-byte voice packet format with CRC32C.
- XcodeGen app project, protocol/codec tests and unsigned IPA packaging workflow.

## Not implemented yet

- GTA SA iOS engine integration, rendering, world/player/vehicle sync, touch controls.
- Joining/authenticating a playable SA-MP session and routing RPCs into the UI.
- SampVoice session/key negotiation, playback, spatial streams and radio routing.
- iOS model/texture/mod loading. Android `.so` hooks cannot run on iOS.
- Apple signing/provisioning. An unsigned IPA must be signed before installation.

The supplied `ROTCITY` directory is the open.mp/Pawn **server**, not an iOS game
engine. Its `models` directory was empty during inspection. It verifies the UI and
voice contracts; it does not supply the missing iOS renderer/game runtime.

## Build on a Mac

Install Xcode and XcodeGen, then run from this repository:

```sh
node tools/verify-assets.mjs
swift test
xcodegen generate --spec iOS/project.yml
xcodebuild -project iOS/RotCity.xcodeproj -scheme RotCity -configuration Release \
  -sdk iphoneos -destination 'generic/platform=iOS' -derivedDataPath build/device \
  CODE_SIGNING_ALLOWED=NO build
```

The Actions workflow packages `Payload/RotCity.app` into `RotCity-iOS-unsigned.ipa`
and uploads an artifact of the same name with installation notes and SHA-256.
It also builds the simulator and launches the app on iPhone and iPad simulators.
These steps remain unverified until Actions is restored or a Mac runs them.

For device signing, open the generated project in Xcode and select your own Apple
development team. Certificates, provisioning profiles and credentials are not
included in the repository.

## Android snapshot maintenance

```sh
node tools/sync-android.mjs /path/to/SAMP-Mobile-GTA-2.11
node tools/vendor-opus.mjs /path/to/SAMP-Mobile-GTA-2.11/app/src/main/cpp/opus
node tools/verify-assets.mjs
```

See [port status](PROJECT_STATUS.md) and [compatibility notes](docs/ANDROID_PARITY.md).
