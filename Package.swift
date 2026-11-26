// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "RotCityIOS",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "RotCityIOS", targets: ["RotCityIOS", "RotCityNativeBridge"]),
    ],
    targets: [
        .target(name: "RotCityIOS", dependencies: ["RotCityNativeBridge"], path: "Sources/RotCityIOS"),
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
