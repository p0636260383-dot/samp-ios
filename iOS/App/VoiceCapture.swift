import AVFoundation
import Combine
import UIKit
import RotCityIOS

/// Real AVAudioEngine capture, resampled to the Android client's 48 kHz mono PCM.
/// Network transmission is deliberately unavailable until the game session negotiates SampVoice.
final class VoiceCapture: ObservableObject {
    @Published private(set) var isCapturing = false
    @Published private(set) var level: Float = 0
    @Published private(set) var status = "48 kHz · Mono · PCM 16-bit"
    private let engine = AVAudioEngine()
    private var hasTap = false
    private var observers: [NSObjectProtocol] = []

    init() {
        for name in [AVAudioSession.interruptionNotification, AVAudioSession.routeChangeNotification,
                     UIApplication.didEnterBackgroundNotification] {
            observers.append(NotificationCenter.default.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in self?.stop() })
        }
    }
    deinit { observers.forEach(NotificationCenter.default.removeObserver); engine.stop() }

    func requestAndStart() {
        AVAudioSession.sharedInstance().requestRecordPermission { [weak self] granted in
            DispatchQueue.main.async {
                guard let self = self else { return }
                if granted { self.start() } else { self.status = "ยังไม่ได้รับอนุญาตใช้ไมโครโฟน" }
            }
        }
    }
    private func start() {
        guard !isCapturing else { return }
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .voiceChat, options: [.defaultToSpeaker, .allowBluetooth])
            try session.setPreferredSampleRate(48000)
            try session.setPreferredIOBufferDuration(0.02)
            try session.setActive(true)
            let input = engine.inputNode
            let source = input.outputFormat(forBus: 0)
            guard source.sampleRate > 0, source.channelCount > 0,
                  let target = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: 48000, channels: 1, interleaved: false),
                  let converter = AVAudioConverter(from: source, to: target),
                  let codec = VoiceCodec() else { throw CaptureError.unsupportedFormat }
            var pendingPCM: [Int16] = []
            input.installTap(onBus: 0, bufferSize: 960, format: source) { [weak self] buffer, _ in
                let capacity = AVAudioFrameCount(ceil(Double(buffer.frameLength) * 48000 / source.sampleRate) + 64)
                guard let output = AVAudioPCMBuffer(pcmFormat: target, frameCapacity: capacity) else { return }
                var supplied = false
                var error: NSError?
                converter.convert(to: output, error: &error) { _, status in
                    if supplied { status.pointee = .noDataNow; return nil }
                    supplied = true; status.pointee = .haveData; return buffer
                }
                guard error == nil, output.frameLength > 0, let pcm = output.int16ChannelData?[0] else { return }
                let count = Int(output.frameLength)
                pendingPCM.append(contentsOf: UnsafeBufferPointer(start: pcm, count: count))
                var packetBytes: Int?
                while pendingPCM.count >= 4800 {
                    let frame = Array(pendingPCM.prefix(4800))
                    pendingPCM.removeFirst(4800)
                    packetBytes = codec.encode(frame)?.count
                }
                let energy = (0..<count).reduce(Float(0)) { sum, i in
                    let sample = Float(pcm[i]) / 32768
                    return sum + sample * sample
                }
                let level = min(1, sqrt(energy / Float(count)) * 5)
                DispatchQueue.main.async {
                    self?.level = level
                    if let bytes = packetBytes { self?.status = "Opus 48 kHz Mono · 100 ms · \(bytes) bytes · ทดสอบในเครื่อง" }
                }
            }
            hasTap = true
            engine.prepare()
            try engine.start()
            isCapturing = true
            status = "กำลังทดสอบไมค์ · 48 kHz Mono · ไม่ส่งเสียงออกจากเครื่อง"
        } catch {
            stop()
            status = "เปิดไมค์ไม่ได้: \(error.localizedDescription)"
        }
    }
    func stop() {
        engine.stop()
        if hasTap { engine.inputNode.removeTap(onBus: 0); hasTap = false }
        isCapturing = false; level = 0
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        status = "ปิดไมค์ · 48 kHz Mono"
    }
    private enum CaptureError: Error { case unsupportedFormat }
}
