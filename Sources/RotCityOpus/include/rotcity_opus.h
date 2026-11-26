#pragma once
#include <stdint.h>
typedef struct rotcity_codec rotcity_codec;
rotcity_codec* rotcity_codec_create(int bitrate);
void rotcity_codec_destroy(rotcity_codec* codec);
int rotcity_codec_encode(rotcity_codec* codec, const int16_t* pcm, int samples, uint8_t* output, int capacity);
int rotcity_codec_decode(rotcity_codec* codec, const uint8_t* packet, int length, int16_t* output, int capacity);
