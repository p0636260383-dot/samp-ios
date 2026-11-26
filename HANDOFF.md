# HANDOFF.md

## From
ROT Lead / local audit

## To
iOS implementation team

## Summary
Use `C:/Users/papaa/Documents/Codex/2026-11-09/0/work/SAMP-Mobile-GTA-2.11` as the main game base, but only extract platform-independent network/RPC/protocol code first. Android-specific hooking/rendering/input must be replaced with iOS PAL.

## Next
1. Create Xcode project on macOS.
2. Port RakNet/SAMPRPC protocol layer.
3. Implement iOS rendering/input/audio.
4. Run ARM64 build and smoke test.
