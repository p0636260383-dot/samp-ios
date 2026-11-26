// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "RotCityIOS",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "RotCityIOS", targets: ["RotCityIOS", "RotCityNativeBridge"]),
    ],
    targets: [
        .target(name: "RotCityIOS", dependencies: ["RotCityNativeBridge", "RotCityOpus"], path: "Sources/RotCityIOS"),
        .target(name: "RotCityOpus", path: "Sources/RotCityOpus", exclude: ["vendor/COPYING", "vendor/AUTHORS"], publicHeadersPath: "include", cSettings: [
            .headerSearchPath("vendor/include"), .headerSearchPath("vendor/celt"),
            .headerSearchPath("vendor/silk"), .headerSearchPath("vendor/silk/float"), .headerSearchPath("vendor/src"),
            .define("OPUS_BUILD"), .define("VAR_ARRAYS"), .define("HAVE_LRINTF"), .define("HAVE_LRINT")
        ]),
        .testTarget(name: "RotCityIOSTests", dependencies: ["RotCityIOS"], path: "Tests/RotCityIOSTests"),
        .target(
            name: "RotCityNativeBridge",
            path: "Sources/RotCityNativeBridge",
            publicHeadersPath: "include",
            cxxSettings: [
                .headerSearchPath("vendor/raknet"),
                .headerSearchPath("vendor/raknet/SAMP"),
                .define("RAKNET", to: "1"),
                .define("RAKSAMP_CLIENT"),
            ]
        ),
    ]
)
