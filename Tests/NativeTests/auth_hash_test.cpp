#include <cstdio>
void SHA1(const char* message, char buffer[64]);
int main(int argc, char** argv) {
    if (argc != 2) return 2;
    char digest[64] = {};
    SHA1(argv[1], digest);
    std::puts(digest);
    return 0;
}
